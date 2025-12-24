function setStatus(text) {
  const el = document.getElementById("status");
  if (el) el.textContent = text;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
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

