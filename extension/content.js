function sanitizeSegment(input, maxLength = 80) {
  const safe = String(input ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

  if (!safe) return "unknown";
  return safe.length <= maxLength ? safe : safe.slice(0, maxLength).replace(/_+$/g, "");
}

function extractJobIdFromLocation() {
  const match = window.location.pathname.match(/\/jobs\/details\/(\d+)/);
  return match?.[1] ?? null;
}

function parseTitleCompanyFromDocTitle(docTitle) {
  const cleaned = String(docTitle ?? "")
    .replace(/\s*\|\s*bdjobs(\.com)?\s*$/i, "")
    .replace(/\s*-\s*bdjobs(\.com)?\s*$/i, "")
    .trim();

  const parts = cleaned
    .split(" - ")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length >= 2) return { title: parts[0], company: parts[1] };
  return { title: cleaned || "Job Circular", company: "unknown" };
}

function toMarkdown({ jobId, url, title, company, rawText }) {
  const savedAt = new Date().toISOString();
  return `---
job_id: "${jobId}"
url: "${url}"
saved_at: "${savedAt}"
title: "${title.replaceAll('"', '\\"')}"
company: "${company.replaceAll('"', '\\"')}"
source: "bdjobs"
parser_version: "0.1.0"
---

# ${title}

**Company:** ${company}

## Raw Text
${rawText.trim()}
`;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "JOBSNAP_EXTRACT_MD") return;

  const jobId = extractJobIdFromLocation();
  if (!jobId) {
    sendResponse({ error: "Not a supported BDJobs job details URL." });
    return;
  }

  const { title, company } = parseTitleCompanyFromDocTitle(document.title);
  const rawText = document.body?.innerText || "";

  const markdown = toMarkdown({ jobId, url: window.location.href, title, company, rawText });
  const filename = `${sanitizeSegment(title)}_${sanitizeSegment(company)}_${jobId}.md`;

  sendResponse({ markdown, filename });
});

