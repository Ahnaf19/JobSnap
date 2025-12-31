import fs from "node:fs/promises";
import path from "node:path";

import { extractJobId } from "../core/extractJobId.js";
import { buildFilename } from "../core/filename.js";
import { parseBdjobsHtml } from "../core/parseBdjobsHtml.js";
import { renderJobMd } from "../core/renderJobMd.js";
import { CliError, ExitCode } from "./errors.js";
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

async function readJson(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveJobSnapshot({
  url,
  outputRoot,
  skipExisting = false,
  filenameTemplate = null,
  dryRun = false
}) {
  const jobId = extractJobId(url);
  if (!jobId) {
    throw new CliError(
      "Could not extract job_id from URL. Expected /jobs/details/<job_id>.",
      ExitCode.INVALID_ARGS
    );
  }

  const jobDir = path.join(outputRoot, jobId);
  const existingJson = path.join(jobDir, "job.json");
  if (skipExisting && (await pathExists(existingJson))) {
    const existing = await readJson(existingJson);
    const mdFilename = buildFilename({
      template: filenameTemplate,
      title: existing?.title,
      company: existing?.company,
      jobId: existing?.job_id ?? jobId
    });
    return {
      jobId,
      jobDir,
      mdPath: path.join(jobDir, mdFilename),
      indexPath: path.join(outputRoot, "index.jsonl"),
      skipped: true,
      dryRun
    };
  }

  const html = await fetchHtml(url);
  const savedAt = new Date().toISOString();
  const job = parseBdjobsHtml({ html, url, savedAt, jobId });
  if (!job) {
    throw new CliError(
      "Parse failed: no job data extracted. The page may not be a job details page.",
      ExitCode.PARSE_FAILED
    );
  }
  const markdown = renderJobMd(job);
  const mdFilename = buildFilename({
    template: filenameTemplate,
    title: job.title,
    company: job.company,
    jobId: job.job_id ?? jobId
  });

  const plannedMdPath = path.join(jobDir, mdFilename);
  const plannedIndexPath = path.join(outputRoot, "index.jsonl");
  if (dryRun) {
    return {
      jobId,
      jobDir,
      mdPath: plannedMdPath,
      indexPath: plannedIndexPath,
      skipped: false,
      dryRun: true
    };
  }

  const { mdPath, indexPath } = await persistSnapshot({
    job,
    html,
    markdown,
    outputRoot,
    jobDir,
    savedAt,
    mdFilename
  });

  return { jobId, jobDir, mdPath, indexPath, skipped: false, dryRun: false };
}
