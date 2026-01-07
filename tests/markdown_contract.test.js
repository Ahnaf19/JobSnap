import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { parseBdjobsHtml } from '../core/parseBdjobsHtml.js';
import { renderJobMd } from '../core/renderJobMd.js';
import { MD_HEADINGS } from '../core/schema.js';

const repoRoot = process.cwd();
const docsFixturesDir = path.join(repoRoot, 'docs', 'fixtures', 'bdjobs');
const manifestPath = path.join(docsFixturesDir, 'manifest.jsonl');

async function loadManifest() {
  try {
    const raw = await fs.readFile(manifestPath, 'utf8');
    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (err) {
    if (err?.code === 'ENOENT') return [];
    throw err;
  }
}

const manifest = await loadManifest();

function getTopHeadings(md) {
  return md
    .split('\n')
    .filter((line) => line.startsWith('## '))
    .map((line) => line.slice(3).trim());
}

test('markdown headings stay within the contract', { skip: manifest.length === 0 }, async () => {
  for (const entry of manifest) {
    const htmlPath = path.join(docsFixturesDir, entry.path);
    const html = await fs.readFile(htmlPath, 'utf8');
    const job = parseBdjobsHtml({
      html,
      url: entry.url,
      jobId: entry.job_id,
      savedAt: entry.saved_at
    });

    const md = renderJobMd(job);
    const headings = getTopHeadings(md);

    for (const heading of headings) {
      assert.ok(MD_HEADINGS.includes(heading), `Unexpected heading: ${heading}`);
    }

    if (job.summary) assert.ok(headings.includes('Summary'));
    if (job.requirements) assert.ok(headings.includes('Requirements'));
    if (job.responsibilities_context) assert.ok(headings.includes('Responsibilities & Context'));
    if (job.skills_expertise) assert.ok(headings.includes('Skills & Expertise'));
    if (job.compensation_other_benefits) {
      assert.ok(headings.includes('Compensation & Other Benefits'));
    }
    if (job.read_before_apply) assert.ok(headings.includes('Read Before Apply'));
    if (job.company_information) assert.ok(headings.includes('Company Information'));
  }
});
