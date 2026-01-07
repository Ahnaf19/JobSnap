import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { parseBdjobsHtml } from '../core/parseBdjobsHtml.js';
import { renderJobMd } from '../core/renderJobMd.js';
import { validateJobSchema, MD_HEADINGS } from '../core/schema.js';

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

const allowedHeadings = new Set(MD_HEADINGS);

function getTopHeadings(md) {
  return md
    .split('\n')
    .filter((line) => line.startsWith('## '))
    .map((line) => line.slice(3).trim());
}

function assertString(value, label) {
  assert.equal(typeof value, 'string', `${label} should be a string`);
  assert.ok(value.trim().length > 0, `${label} should not be empty`);
}

function assertSectionHasContent(section, label) {
  assert.ok(section && typeof section === 'object', `${label} should be an object`);
  assert.ok(Object.keys(section).length > 0, `${label} should not be empty`);
}

function assertResponsibilities(responsibilities) {
  assert.ok(responsibilities, 'responsibilities_context should exist');
  if (responsibilities.sections) {
    const keys = Object.keys(responsibilities.sections);
    assert.ok(keys.length > 0, 'responsibilities_context.sections should not be empty');
    for (const [title, block] of Object.entries(responsibilities.sections)) {
      assert.ok(block, `responsibilities_context.sections.${title} should exist`);
      const bullets = Array.isArray(block.bullets) ? block.bullets.filter(Boolean) : [];
      const text = typeof block.text === 'string' ? block.text.trim() : '';
      assert.ok(bullets.length > 0 || text.length > 0, `${title} should have content`);
    }
    return;
  }

  if (typeof responsibilities.raw_text === 'string') {
    assert.ok(responsibilities.raw_text.trim().length > 0, 'responsibilities_context.raw_text should not be empty');
    return;
  }

  assert.fail('responsibilities_context must contain sections or raw_text');
}

test('regression fixtures (docs)', { skip: manifest.length === 0 }, async () => {
  for (const entry of manifest) {
    const htmlPath = path.join(docsFixturesDir, entry.path);
    const html = await fs.readFile(htmlPath, 'utf8');
    const job = parseBdjobsHtml({
      html,
      url: entry.url,
      jobId: entry.job_id,
      savedAt: entry.saved_at
    });

    assertString(job.job_id, 'job_id');
    assert.equal(job.job_id, entry.job_id, 'job_id should match fixture id');
    assertString(job.title, 'title');
    assertString(job.company, 'company');
    assertString(job.url, 'url');
    assertString(job.source, 'source');
    assertString(job.parser_version, 'parser_version');

    const schema = validateJobSchema(job);
    assert.equal(schema.ok, true, schema.errors.join('; '));

    assertSectionHasContent(job.summary, 'summary');
    assertSectionHasContent(job.requirements, 'requirements');
    assertResponsibilities(job.responsibilities_context);
    assertSectionHasContent(job.company_information, 'company_information');

    const md = renderJobMd(job);
    const headings = getTopHeadings(md);
    for (const heading of headings) {
      assert.ok(allowedHeadings.has(heading), `Unexpected heading: ${heading}`);
    }

    if (job.summary) assert.ok(headings.includes('Summary'));
    if (job.requirements) assert.ok(headings.includes('Requirements'));
    if (job.responsibilities_context) assert.ok(headings.includes('Responsibilities & Context'));
    if (job.skills_expertise) assert.ok(headings.includes('Skills & Expertise'));
    if (job.compensation_other_benefits) assert.ok(headings.includes('Compensation & Other Benefits'));
    if (job.read_before_apply) assert.ok(headings.includes('Read Before Apply'));
    if (job.company_information) assert.ok(headings.includes('Company Information'));
  }
});
