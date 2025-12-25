import path from "node:path";

import { extractJobId } from "../core/extractJobId.js";
import { parseBdjobsHtml } from "../core/parseBdjobsHtml.js";
import { renderJobMd } from "../core/renderJobMd.js";
import { fetchHtml } from "./fetch.js";
import { persistSnapshot } from "./snapshot.js";

export async function saveJobSnapshot({ url, outputRoot }) {
  const jobId = extractJobId(url);
  if (!jobId) {
    throw new Error("Could not extract job_id from URL. Expected /jobs/details/<job_id>.");
  }

  const html = await fetchHtml(url);
  const savedAt = new Date().toISOString();
  const job = parseBdjobsHtml({ html, url, savedAt, jobId });
  const markdown = renderJobMd(job);

  const jobDir = path.join(outputRoot, jobId);
  const { mdPath, indexPath } = await persistSnapshot({
    job,
    html,
    markdown,
    outputRoot,
    jobDir,
    savedAt
  });

  return { jobId, jobDir, mdPath, indexPath };
}
