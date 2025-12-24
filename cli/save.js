import crypto from "node:crypto";
import path from "node:path";

import { extractJobId } from "../core/extractJobId.js";
import { parseBdjobsHtml } from "../core/parseBdjobsHtml.js";
import { renderJobMd } from "../core/renderJobMd.js";
import { fetchHtml } from "./fetch.js";
import { ensureDir, updateIndex, writeJson, writeText } from "./fs.js";

function sha256(text) {
  return crypto.createHash("sha256").update(String(text ?? ""), "utf8").digest("hex");
}

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
  await ensureDir(jobDir);

  const rawHtmlPath = path.join(jobDir, "raw.html");
  const jsonPath = path.join(jobDir, "job.json");
  const mdPath = path.join(jobDir, "job.md");

  await writeText(rawHtmlPath, html);
  await writeJson(jsonPath, job);
  await writeText(mdPath, markdown);

  const indexEntry = {
    job_id: jobId,
    url,
    saved_at: savedAt,
    title: job.title,
    company: job.company,
    application_deadline: job.application_deadline,
    published: job.published,
    content_hash: sha256(markdown),
    paths: {
      raw_html: path.relative(outputRoot, rawHtmlPath),
      job_json: path.relative(outputRoot, jsonPath),
      job_md: path.relative(outputRoot, mdPath)
    },
    parser_version: job.parser_version
  };

  const indexPath = path.join(outputRoot, "index.jsonl");
  await updateIndex(indexPath, indexEntry);

  return { jobId, jobDir, mdPath, indexPath };
}

