const statusEl = document.getElementById('status');
const urlInput = document.getElementById('url-input');
const filenamePartInputs = Array.from(document.querySelectorAll('input[name="filename-part"]'));
const formatInputs = Array.from(document.querySelectorAll('input[name="download-format"]'));
const downloadTabBtn = document.getElementById('download-tab');
const downloadUrlBtn = document.getElementById('download-url');
const DEFAULT_TEMPLATE = '{title}_{company}_{job_id}.md';
const DEFAULT_PARTS = ['title', 'company', 'job_id'];
const PART_ORDER = ['title', 'company', 'job_id'];
const PART_TOKENS = {
  title: '{title}',
  company: '{company}',
  job_id: '{job_id}'
};

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function setBusy(isBusy) {
  if (downloadTabBtn) downloadTabBtn.disabled = isBusy;
  if (downloadUrlBtn) downloadUrlBtn.disabled = isBusy;
  if (urlInput) urlInput.disabled = isBusy;
  filenamePartInputs.forEach((input) => {
    input.disabled = isBusy;
  });
  formatInputs.forEach((input) => {
    input.disabled = isBusy;
  });
}

function getSelectedFormat() {
  const selected = formatInputs.find((input) => input.checked);
  return selected?.value || 'markdown';
}

function getSelectedParts() {
  const selected = new Set(
    filenamePartInputs.filter((input) => input.checked).map((input) => input.value)
  );
  return PART_ORDER.filter((part) => selected.has(part));
}

function applySelectedParts(parts) {
  const selected = new Set(Array.isArray(parts) ? parts : []);
  filenamePartInputs.forEach((input) => {
    input.checked = selected.has(input.value);
  });
}

function buildTemplateFromParts(parts) {
  const tokens = parts.map((part) => PART_TOKENS[part]).filter(Boolean);
  if (!tokens.length) return null;
  return `${tokens.join('_')}.md`;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}

async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
    return true;
  } catch (err) {
    return false;
  }
}

async function pingContentScript(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: 'JOBSNAP_PING' });
    return Boolean(response?.ok);
  } catch (err) {
    return false;
  }
}

let corePromise = null;
async function loadCore() {
  if (!corePromise) {
    corePromise = Promise.all([
      import(chrome.runtime.getURL('core/parseBdjobsHtml.js')),
      import(chrome.runtime.getURL('core/renderJobMd.js')),
      import(chrome.runtime.getURL('core/extractJobId.js')),
      import(chrome.runtime.getURL('core/filename.js')),
      import(chrome.runtime.getURL('core/exportPdf.js'))
    ]);
  }
  const [
    { parseBdjobsHtml },
    { renderJobMd },
    { extractJobId },
    { buildFilename },
    { exportJobAsPDF }
  ] = await corePromise;
  return { parseBdjobsHtml, renderJobMd, extractJobId, buildFilename, exportJobAsPDF };
}

let html2pdfLoaded = false;
async function loadHtml2Pdf() {
  if (html2pdfLoaded) return;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('html2pdf.bundle.min.js');
    script.onload = () => {
      html2pdfLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load html2pdf library'));
    document.head.appendChild(script);
  });
}

/**
 * Check if native PDF generation is available (Chrome/Edge only)
 */
function hasNativePDFSupport() {
  return typeof chrome.tabs !== 'undefined' &&
         typeof chrome.tabs.printToPDF === 'function';
}

/**
 * Generate PDF using Chrome's native print engine (vector PDF)
 */
async function generatePDF_Native(jobData, markdown, filename) {
  // Generate HTML using same template
  const { generateJobHTML, stripMetadata } = await import(chrome.runtime.getURL('core/exportPdf.js'));
  const cleanedMd = stripMetadata(markdown);
  const html = generateJobHTML(jobData, cleanedMd);

  // Send to service worker for native PDF generation
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: 'GENERATE_PDF_NATIVE',
        html,
        filename
      },
      (response) => {
        if (response?.success) {
          // Download the PDF
          const blob = new Blob([new Uint8Array(response.pdfData)], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const pdfFilename = response.filename;

          chrome.downloads.download(
            {
              url,
              filename: pdfFilename,
              saveAs: true
            },
            () => {
              URL.revokeObjectURL(url);
              resolve(pdfFilename);
            }
          );
        } else {
          reject(new Error(response?.error || 'PDF generation failed'));
        }
      }
    );
  });
}

/**
 * Generate PDF using html2pdf.js fallback (rasterized PDF)
 */
async function generatePDF_Fallback(jobData, markdown, filename) {
  await loadHtml2Pdf();
  const { exportJobAsPDF } = await loadCore();

  await exportJobAsPDF({
    jobData,
    markdown,
    filename
  });

  return filename.replace(/\.md$/, '.pdf');
}

/**
 * Generate PDF using best available method
 */
async function generatePDF(jobData, markdown, filename) {
  if (hasNativePDFSupport()) {
    // Chrome/Edge: Use native PDF (vector, ~200KB)
    return await generatePDF_Native(jobData, markdown, filename);
  } else {
    // Firefox/Safari: Use html2pdf.js (raster, ~400KB)
    return await generatePDF_Fallback(jobData, markdown, filename);
  }
}

function downloadMarkdown({ filename, markdown }) {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download(
    {
      url,
      filename,
      saveAs: true
    },
    () => URL.revokeObjectURL(url)
  );
}

async function handleCurrentTab() {
  const format = getSelectedFormat();
  setStatus('Working...');
  setBusy(true);
  try {
    const tab = await getActiveTab();
    if (!tab?.id) {
      setStatus('No active tab.');
      return;
    }

    const ready = await pingContentScript(tab.id);
    if (!ready) {
      const injected = await injectContentScript(tab.id);
      if (!injected) {
        setStatus('Could not inject content script. Make sure this is a BDJobs job page.');
        return;
      }
    }

    const template = buildTemplateFromParts(getSelectedParts());
    if (!template) {
      setStatus('Select at least one filename part.');
      return;
    }
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'JOBSNAP_EXTRACT_MD',
      template
    });
    if (!response?.markdown) {
      setStatus(response?.error || 'Could not extract content on this page.');
      return;
    }

    if (format === 'pdf') {
      setStatus('Generating PDF...');
      const jobData = extractJobDataFromResponse(response);
      const pdfFilename = await generatePDF(jobData, response.markdown, response.filename);
      setStatus(`Last snapped:\n${pdfFilename}`);
    } else {
      downloadMarkdown({ filename: response.filename, markdown: response.markdown });
      setStatus(`Last snapped:\n${response.filename}`);
    }
  } catch (err) {
    setStatus(String(err?.message ?? err));
  } finally {
    setBusy(false);
  }
}

function extractJobDataFromResponse(response) {
  // Parse YAML frontmatter to extract job metadata
  const lines = response.markdown.split('\n');
  const jobData = {};

  if (lines[0] === '---') {
    let i = 1;
    while (i < lines.length && lines[i] !== '---') {
      const match = lines[i].match(/^(\w+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        jobData[key] = value.replace(/^["']|["']$/g, ''); // Remove quotes
      }
      i++;
    }
  }

  return jobData;
}

async function handleUrlDownload() {
  const inputValue = String(urlInput?.value ?? '').trim();
  if (!inputValue) {
    setStatus('Paste a BDJobs link first.');
    return;
  }

  const format = getSelectedFormat();
  setStatus('Fetching...');
  setBusy(true);
  try {
    const { parseBdjobsHtml, renderJobMd, extractJobId, buildFilename } = await loadCore();
    const jobId = extractJobId(inputValue);
    if (!jobId) {
      setStatus('Not a supported BDJobs job details URL.');
      return;
    }

    const response = await fetch(inputValue, { credentials: 'omit' });
    if (!response.ok) {
      setStatus(`Fetch failed (${response.status}).`);
      return;
    }

    const html = await response.text();
    const savedAt = new Date().toISOString();
    const job = parseBdjobsHtml({ html, url: inputValue, jobId, savedAt });
    const markdown = renderJobMd(job);
    const template = buildTemplateFromParts(getSelectedParts());
    if (!template) {
      setStatus('Select at least one filename part.');
      return;
    }
    const filename = buildFilename({
      template,
      title: job.title,
      company: job.company,
      jobId: job.job_id ?? jobId
    });

    if (format === 'pdf') {
      setStatus('Generating PDF...');
      const pdfFilename = await generatePDF(job, markdown, filename);
      setStatus(`Last snapped:\n${pdfFilename}`);
    } else {
      downloadMarkdown({ filename, markdown });
      setStatus(`Last snapped:\n${filename}`);
    }
  } catch (err) {
    setStatus(String(err?.message ?? err));
  } finally {
    setBusy(false);
  }
}

downloadTabBtn?.addEventListener('click', handleCurrentTab);
downloadUrlBtn?.addEventListener('click', handleUrlDownload);

async function loadStoredFilenameParts() {
  if (!filenamePartInputs.length) return;
  try {
    const stored = await chrome.storage.sync.get({
      filenameParts: null,
      filenameTemplate: DEFAULT_TEMPLATE
    });
    if (Array.isArray(stored.filenameParts) && stored.filenameParts.length) {
      applySelectedParts(stored.filenameParts);
      return;
    }
    const template = String(stored.filenameTemplate || DEFAULT_TEMPLATE);
    const parts = PART_ORDER.filter((part) => template.includes(PART_TOKENS[part]));
    applySelectedParts(parts.length ? parts : DEFAULT_PARTS);
  } catch {
    applySelectedParts(DEFAULT_PARTS);
  }
}

filenamePartInputs.forEach((input) => {
  input.addEventListener('change', async () => {
    const parts = getSelectedParts();
    try {
      await chrome.storage.sync.set({ filenameParts: parts });
    } catch {
      // ignore storage errors
    }
  });
});

applySelectedParts(DEFAULT_PARTS);
loadStoredFilenameParts();
