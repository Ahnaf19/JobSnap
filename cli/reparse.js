import fs from "node:fs/promises";
import path from "node:path";

import { extractJobId } from "../core/extractJobId.js";
import { parseBdjobsHtml } from "../core/parseBdjobsHtml.js";
import { renderJobMd } from "../core/renderJobMd.js";
import { persistSnapshot } from "./snapshot.js";

async function readJson(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function resolveRawHtmlPath(targetPath) {
  const stats = await fs.stat(targetPath);
  if (stats.isDirectory()) {
    return {
      jobDir: targetPath,
      rawHtmlPath: path.join(targetPath, "raw.html")
    };
  }

  return {
    jobDir: path.dirname(targetPath),
    rawHtmlPath: targetPath
  };
}

export async function reparseJobSnapshot({ targetPath }) {
  const { jobDir, rawHtmlPath } = await resolveRawHtmlPath(targetPath);

  const html = await fs.readFile(rawHtmlPath, "utf8");
  const savedAt = new Date().toISOString();

  const existing = await readJson(path.join(jobDir, "job.json"));
  const jobId =
    existing?.job_id ??
    extractJobId(existing?.url ?? "") ??
    (path.basename(jobDir).match(/^\d+$/) ? path.basename(jobDir) : null);
  const url = existing?.url ?? (jobId ? `https://bdjobs.com/jobs/details/${jobId}` : null);

  const job = parseBdjobsHtml({ html, url, jobId, savedAt });
  const markdown = renderJobMd(job);

  const outputRoot = path.dirname(jobDir);
  const { mdPath, indexPath } = await persistSnapshot({
    job,
    html,
    markdown,
    outputRoot,
    jobDir,
    savedAt
  });

  return { jobDir, mdPath, indexPath };
}
