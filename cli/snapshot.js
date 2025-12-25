import crypto from "node:crypto";
import path from "node:path";

import { ensureDir, updateIndex, writeJson, writeText } from "./fs.js";

function sha256(text) {
  return crypto.createHash("sha256").update(String(text ?? ""), "utf8").digest("hex");
}

export async function persistSnapshot({ job, html, markdown, outputRoot, jobDir, savedAt }) {
  if (!job) throw new Error("Missing job data.");

  await ensureDir(jobDir);

  const rawHtmlPath = path.join(jobDir, "raw.html");
  const jsonPath = path.join(jobDir, "job.json");
  const mdPath = path.join(jobDir, "job.md");

  await writeText(rawHtmlPath, html);
  await writeJson(jsonPath, job);
  await writeText(mdPath, markdown);

  const indexEntry = {
    job_id: job.job_id,
    url: job.url,
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

  return { jobDir, mdPath, indexPath };
}
