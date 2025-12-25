const statusEl = document.getElementById("status");
const urlInput = document.getElementById("url-input");
const downloadTabBtn = document.getElementById("download-tab");
const downloadUrlBtn = document.getElementById("download-url");

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function setBusy(isBusy) {
  if (downloadTabBtn) downloadTabBtn.disabled = isBusy;
  if (downloadUrlBtn) downloadUrlBtn.disabled = isBusy;
  if (urlInput) urlInput.disabled = isBusy;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}

async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    });
    return true;
  } catch (err) {
    return false;
  }
}

async function pingContentScript(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: "JOBSNAP_PING" });
    return Boolean(response?.ok);
  } catch (err) {
    return false;
  }
}

let corePromise = null;
async function loadCore() {
  if (!corePromise) {
    corePromise = Promise.all([
      import(chrome.runtime.getURL("core/parseBdjobsHtml.js")),
      import(chrome.runtime.getURL("core/renderJobMd.js")),
      import(chrome.runtime.getURL("core/strings.js")),
      import(chrome.runtime.getURL("core/extractJobId.js"))
    ]);
  }
  const [
    { parseBdjobsHtml },
    { renderJobMd },
    { sanitizeFilenameSegment },
    { extractJobId }
  ] = await corePromise;
  return { parseBdjobsHtml, renderJobMd, sanitizeFilenameSegment, extractJobId };
}

function downloadMarkdown({ filename, markdown }) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
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
  setStatus("Working...");
  setBusy(true);
  try {
    const tab = await getActiveTab();
    if (!tab?.id) {
      setStatus("No active tab.");
      return;
    }

    const ready = await pingContentScript(tab.id);
    if (!ready) {
      const injected = await injectContentScript(tab.id);
      if (!injected) {
        setStatus("Could not inject content script. Make sure this is a BDJobs job page.");
        return;
      }
    }

    const response = await chrome.tabs.sendMessage(tab.id, { type: "JOBSNAP_EXTRACT_MD" });
    if (!response?.markdown) {
      setStatus(response?.error || "Could not extract content on this page.");
      return;
    }
    downloadMarkdown({ filename: response.filename, markdown: response.markdown });
    setStatus(`Downloaded:\n${response.filename}`);
  } catch (err) {
    setStatus(String(err?.message ?? err));
  } finally {
    setBusy(false);
  }
}

async function handleUrlDownload() {
  const inputValue = String(urlInput?.value ?? "").trim();
  if (!inputValue) {
    setStatus("Paste a BDJobs link first.");
    return;
  }

  setStatus("Fetching...");
  setBusy(true);
  try {
    const { parseBdjobsHtml, renderJobMd, sanitizeFilenameSegment, extractJobId } = await loadCore();
    const jobId = extractJobId(inputValue);
    if (!jobId) {
      setStatus("Not a supported BDJobs job details URL.");
      return;
    }

    const response = await fetch(inputValue, { credentials: "omit" });
    if (!response.ok) {
      setStatus(`Fetch failed (${response.status}).`);
      return;
    }

    const html = await response.text();
    const savedAt = new Date().toISOString();
    const job = parseBdjobsHtml({ html, url: inputValue, jobId, savedAt });
    const markdown = renderJobMd(job);
    const safeTitle = sanitizeFilenameSegment(job.title || "job");
    const safeCompany = sanitizeFilenameSegment(job.company || "unknown");
    const filename = `${safeTitle}_${safeCompany}_${jobId}.md`;
    downloadMarkdown({ filename, markdown });
    setStatus(`Downloaded:\n${filename}`);
  } catch (err) {
    setStatus(String(err?.message ?? err));
  } finally {
    setBusy(false);
  }
}

downloadTabBtn?.addEventListener("click", handleCurrentTab);
downloadUrlBtn?.addEventListener("click", handleUrlDownload);
