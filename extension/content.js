(() => {
  if (globalThis.__jobsnapContentLoaded) return;
  globalThis.__jobsnapContentLoaded = true;

  let corePromise = null;

  async function loadCore() {
    if (!corePromise) {
      corePromise = Promise.all([
        import(chrome.runtime.getURL('core/parseBdjobsHtml.js')),
        import(chrome.runtime.getURL('core/renderJobMd.js')),
        import(chrome.runtime.getURL('core/strings.js')),
        import(chrome.runtime.getURL('core/filename.js'))
      ]);
    }
    const [{ parseBdjobsHtml }, { renderJobMd }, , { buildFilename }] = await corePromise;
    return { parseBdjobsHtml, renderJobMd, buildFilename };
  }

  function extractJobIdFromLocation() {
    const match = window.location.pathname.match(/\/jobs\/details\/(\d+)/);
    return match?.[1] ?? null;
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'JOBSNAP_PING') {
      sendResponse({ ok: true });
      return;
    }
    if (message?.type !== 'JOBSNAP_EXTRACT_MD') return;

    const jobId = extractJobIdFromLocation();
    if (!jobId) {
      sendResponse({ error: 'Not a supported BDJobs job details URL.' });
      return;
    }

    (async () => {
      try {
        const { parseBdjobsHtml, renderJobMd, buildFilename } = await loadCore();
        const html = document.documentElement?.outerHTML || '';
        const savedAt = new Date().toISOString();
        const job = parseBdjobsHtml({ html, url: window.location.href, jobId, savedAt });
        const markdown = renderJobMd(job);
        const filename = buildFilename({
          template: message?.template,
          title: job.title,
          company: job.company,
          jobId: job.job_id ?? jobId
        });
        sendResponse({ markdown, filename });
      } catch (err) {
        sendResponse({ error: String(err?.message ?? err) });
      }
    })();
    return true;
  });
})();
