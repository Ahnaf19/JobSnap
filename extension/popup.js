function setStatus(text) {
  const el = document.getElementById("status");
  if (el) el.textContent = text;
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

function downloadMarkdown({ filename, markdown }) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download(
    {
      url,
      filename,
      saveAs: true
    },
    () => {
      URL.revokeObjectURL(url);
    }
  );
}

document.getElementById("download")?.addEventListener("click", async () => {
  setStatus("Working...");

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

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: "JOBSNAP_EXTRACT_MD" });
    if (!response?.markdown) {
      setStatus(response?.error || "Could not extract content on this page.");
      return;
    }
    downloadMarkdown({ filename: response.filename, markdown: response.markdown });
    setStatus(`Downloaded:\n${response.filename}`);
  } catch (err) {
    setStatus(String(err?.message ?? err));
  }
});
