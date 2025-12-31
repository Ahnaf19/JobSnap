import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { parseBdjobsHtml } from "../core/parseBdjobsHtml.js";
import { renderJobMd } from "../core/renderJobMd.js";
import { validateJobSchema, MD_HEADINGS } from "../core/schema.js";

const repoRoot = process.cwd();
const fixtureDir = path.join(repoRoot, "tests", "fixtures");

async function loadFixture(name) {
  return await fs.readFile(path.join(fixtureDir, name), "utf8");
}

function getTopHeadings(md) {
  return md
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line) => line.slice(3).trim());
}

test("schema validation passes on baseline fixtures", async () => {
  const html = await loadFixture("job_details_1.html");
  const job = parseBdjobsHtml({
    html,
    url: "https://bdjobs.com/jobs/details/123",
    jobId: "123",
    savedAt: "test"
  });

  const result = validateJobSchema(job);
  assert.equal(result.ok, true, result.errors.join("; "));

  const md = renderJobMd(job);
  const headings = getTopHeadings(md);
  for (const heading of headings) {
    assert.ok(MD_HEADINGS.includes(heading), `Unexpected heading: ${heading}`);
  }
});
