import fs from "node:fs/promises";
import path from "node:path";

import { extractJobId } from "../core/extractJobId.js";
import { buildFilename } from "../core/filename.js";
import { parseBdjobsHtml } from "../core/parseBdjobsHtml.js";
import { renderJobMd } from "../core/renderJobMd.js";
import { CliError, ExitCode } from "./errors.js";
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
  let stats;
  try {
    stats = await fs.stat(targetPath);
  } catch {
    throw new CliError(`Path not found: ${targetPath}`, ExitCode.INVALID_ARGS);
  }
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

export async function reparseJobSnapshot({ targetPath, filenameTemplate = null }) {
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
  if (!job) {
    throw new CliError("Parse failed: no job data extracted.", ExitCode.PARSE_FAILED);
  }
  const markdown = renderJobMd(job);
  const mdFilename = buildFilename({
    template: filenameTemplate,
    title: job.title,
    company: job.company,
    jobId: job.job_id ?? jobId
  });

  const outputRoot = path.dirname(jobDir);
  const { mdPath, indexPath } = await persistSnapshot({
    job,
    html,
    markdown,
    outputRoot,
    jobDir,
    savedAt,
    mdFilename
  });

  return { jobDir, mdPath, indexPath };
}
