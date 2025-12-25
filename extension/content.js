(() => {
  if (globalThis.__jobsnapContentLoaded) return;
  globalThis.__jobsnapContentLoaded = true;

  let corePromise = null;

  async function loadCore() {
    if (!corePromise) {
      corePromise = Promise.all([
        import(chrome.runtime.getURL("core/parseBdjobsHtml.js")),
        import(chrome.runtime.getURL("core/renderJobMd.js")),
        import(chrome.runtime.getURL("core/strings.js"))
      ]);
    }
    const [{ parseBdjobsHtml }, { renderJobMd }, { sanitizeFilenameSegment }] = await corePromise;
    return { parseBdjobsHtml, renderJobMd, sanitizeFilenameSegment };
  }

  function extractJobIdFromLocation() {
    const match = window.location.pathname.match(/\/jobs\/details\/(\d+)/);
    return match?.[1] ?? null;
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "JOBSNAP_PING") {
      sendResponse({ ok: true });
      return;
    }
    if (message?.type !== "JOBSNAP_EXTRACT_MD") return;

    const jobId = extractJobIdFromLocation();
    if (!jobId) {
      sendResponse({ error: "Not a supported BDJobs job details URL." });
      return;
    }

    (async () => {
      try {
        const { parseBdjobsHtml, renderJobMd, sanitizeFilenameSegment } = await loadCore();
        const html = document.documentElement?.outerHTML || "";
        const savedAt = new Date().toISOString();
        const job = parseBdjobsHtml({ html, url: window.location.href, jobId, savedAt });
        const markdown = renderJobMd(job);
        const safeTitle = sanitizeFilenameSegment(job.title || "job");
        const safeCompany = sanitizeFilenameSegment(job.company || "unknown");
        const filename = `${safeTitle}_${safeCompany}_${jobId}.md`;
        sendResponse({ markdown, filename });
      } catch (err) {
        sendResponse({ error: String(err?.message ?? err) });
      }
    })();
    return true;
  });
})();
