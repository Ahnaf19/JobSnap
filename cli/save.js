import fs from "node:fs/promises";
import path from "node:path";

import { extractJobId } from "../core/extractJobId.js";
import { parseBdjobsHtml } from "../core/parseBdjobsHtml.js";
import { renderJobMd } from "../core/renderJobMd.js";
import { fetchHtml } from "./fetch.js";
import { persistSnapshot } from "./snapshot.js";

async function pathExists(filePath) {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function saveJobSnapshot({ url, outputRoot, skipExisting = false }) {
  const jobId = extractJobId(url);
  if (!jobId) {
    throw new Error("Could not extract job_id from URL. Expected /jobs/details/<job_id>.");
  }

  const jobDir = path.join(outputRoot, jobId);
  const existingJson = path.join(jobDir, "job.json");
  if (skipExisting && (await pathExists(existingJson))) {
    return {
      jobId,
      jobDir,
      mdPath: path.join(jobDir, "job.md"),
      indexPath: path.join(outputRoot, "index.jsonl"),
      skipped: true
    };
  }

  const html = await fetchHtml(url);
  const savedAt = new Date().toISOString();
  const job = parseBdjobsHtml({ html, url, savedAt, jobId });
  const markdown = renderJobMd(job);

  const { mdPath, indexPath } = await persistSnapshot({
    job,
    html,
    markdown,
    outputRoot,
    jobDir,
    savedAt
  });

  return { jobId, jobDir, mdPath, indexPath, skipped: false };
}
