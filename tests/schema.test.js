import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { parseBdjobsHtml } from "../core/parseBdjobsHtml.js";
import { renderJobMd } from "../core/renderJobMd.js";
import {
  validateJobSchema,
  MD_HEADINGS,
  migrateIndexEntry,
  validateIndexEntry,
  createIndexEntry
} from "../core/schema.js";

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

// =============================================================================
// v1.0 Schema Tests
// =============================================================================

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

// =============================================================================
// v2.0 Schema Tests (Backward Compatibility)
// =============================================================================

test("migrateIndexEntry preserves v1.0 fields", () => {
  const v1Entry = {
    job_id: '1436685',
    title: 'Software Engineer',
    company: 'ABC Tech',
    saved_at: '2024-12-25T10:30:00Z'
  };

  const v2Entry = migrateIndexEntry(v1Entry);

  // All v1.0 fields preserved
  assert.equal(v2Entry.job_id, v1Entry.job_id);
  assert.equal(v2Entry.title, v1Entry.title);
  assert.equal(v2Entry.company, v1Entry.company);
  assert.equal(v2Entry.saved_at, v1Entry.saved_at);

  // New v2.0 fields added with defaults
  assert.ok(Array.isArray(v2Entry.tags));
  assert.equal(v2Entry.tags.length, 0);
  assert.ok(v2Entry.metadata);
  assert.equal(v2Entry.metadata.has_pdf, false);
  assert.equal(v2Entry.metadata.has_ai_summary, false);
  assert.equal(v2Entry.metadata.last_parsed, v1Entry.saved_at);
  assert.equal(v2Entry.metadata.parser_version, '1.0.0');
});

test("migrateIndexEntry is idempotent (v2.0 entry unchanged)", () => {
  const v2Entry = {
    job_id: '1436685',
    title: 'Software Engineer',
    company: 'ABC Tech',
    saved_at: '2024-12-25T10:30:00Z',
    tags: ['backend'],
    metadata: {
      has_pdf: true,
      has_ai_summary: false,
      last_parsed: '2024-12-25T10:30:00Z',
      parser_version: '2.0.0'
    }
  };

  const migrated = migrateIndexEntry(v2Entry);

  // Should be unchanged
  assert.deepEqual(migrated, v2Entry);
});

test("validateIndexEntry passes for valid v2.0 entry", () => {
  const entry = {
    job_id: '1436685',
    title: 'Software Engineer',
    company: 'ABC Tech',
    saved_at: '2024-12-25T10:30:00Z',
    tags: ['backend', 'urgent'],
    metadata: {
      has_pdf: true,
      has_ai_summary: false,
      last_parsed: '2024-12-25T10:30:00Z',
      parser_version: '2.0.0'
    }
  };

  const result = validateIndexEntry(entry);

  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test("validateIndexEntry fails for missing required fields", () => {
  const entry = {
    job_id: '1436685',
    title: 'Software Engineer'
    // Missing: company, saved_at
  };

  const result = validateIndexEntry(entry);

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('missing company'));
  assert.ok(result.errors.includes('missing saved_at'));
});

test("validateIndexEntry fails for invalid tags type", () => {
  const entry = {
    job_id: '1436685',
    title: 'Software Engineer',
    company: 'ABC Tech',
    saved_at: '2024-12-25T10:30:00Z',
    tags: 'backend' // Should be array, not string
  };

  const result = validateIndexEntry(entry);

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('tags must be an array'));
});

test("createIndexEntry generates valid v2.0 entry from job", () => {
  const job = {
    job_id: '1436685',
    url: 'https://bdjobs.com/jobs/details/1436685',
    saved_at: '2024-12-25T10:30:00Z',
    source: 'bdjobs',
    parser_version: '2.0.0',
    title: 'Software Engineer',
    company: 'ABC Tech',
    summary: 'Test job',
    application_deadline: '2024-12-31',
    published: '2024-12-15',
    requirements: {},
    responsibilities_context: {},
    company_information: 'Test company',
    metadata: {
      tags: ['backend', 'urgent']
    }
  };

  const indexEntry = createIndexEntry(job);

  // Should have required index fields
  assert.equal(indexEntry.job_id, '1436685');
  assert.equal(indexEntry.title, 'Software Engineer');
  assert.equal(indexEntry.company, 'ABC Tech');
  assert.equal(indexEntry.saved_at, '2024-12-25T10:30:00Z');

  // Should have optional deadline fields
  assert.equal(indexEntry.application_deadline, '2024-12-31');
  assert.equal(indexEntry.published, '2024-12-15');

  // Should have tags from job.metadata.tags
  assert.deepEqual(indexEntry.tags, ['backend', 'urgent']);

  // Should have metadata
  assert.ok(indexEntry.metadata);
  assert.equal(indexEntry.metadata.has_pdf, false); // Defaults to false
  assert.equal(indexEntry.metadata.parser_version, '2.0.0');

  // Should pass validation
  const validation = validateIndexEntry(indexEntry);
  assert.equal(validation.valid, true);
});

test("createIndexEntry handles missing optional fields", () => {
  const job = {
    job_id: '1436685',
    url: 'https://bdjobs.com/jobs/details/1436685',
    saved_at: '2024-12-25T10:30:00Z',
    source: 'bdjobs',
    parser_version: '1.0.0',
    title: 'Software Engineer',
    company: 'ABC Tech',
    summary: 'Test job',
    requirements: {},
    responsibilities_context: {},
    company_information: 'Test company'
    // No application_deadline, published, or metadata
  };

  const indexEntry = createIndexEntry(job);

  // Optional fields should be null
  assert.equal(indexEntry.application_deadline, null);
  assert.equal(indexEntry.published, null);

  // Tags should be empty array
  assert.deepEqual(indexEntry.tags, []);

  // Should still pass validation
  const validation = validateIndexEntry(indexEntry);
  assert.equal(validation.valid, true);
});
