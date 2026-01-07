const statusEl = document.getElementById('status');
const filenamePartInputs = Array.from(document.querySelectorAll('input[name="filename-part"]'));

const DEFAULT_PARTS = ['title', 'company', 'job_id'];
const PART_ORDER = ['title', 'company', 'job_id'];

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
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

async function loadStoredParts() {
  try {
    const stored = await chrome.storage.sync.get({ filenameParts: DEFAULT_PARTS });
    const parts = Array.isArray(stored.filenameParts) && stored.filenameParts.length
      ? stored.filenameParts
      : DEFAULT_PARTS;
    applySelectedParts(parts);
  } catch {
    applySelectedParts(DEFAULT_PARTS);
  }
}

async function saveParts() {
  const parts = getSelectedParts();
  if (!parts.length) {
    setStatus('Select at least one part.');
    return;
  }
  try {
    await chrome.storage.sync.set({ filenameParts: parts });
    setStatus('Defaults saved.');
  } catch {
    setStatus('Could not save defaults.');
  }
}

filenamePartInputs.forEach((input) => {
  input.addEventListener('change', saveParts);
});

loadStoredParts();
