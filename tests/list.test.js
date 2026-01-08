import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { IndexManager } from '../core/index-manager.js';

const testDir = path.join(process.cwd(), 'test-jobs-list');
const indexPath = path.join(testDir, 'index.jsonl');

// Helper to create test index
async function createTestIndex(entries) {
  await fs.mkdir(testDir, { recursive: true });
  const manager = new IndexManager(indexPath);
  for (const entry of entries) {
    await manager.appendEntry(entry);
  }
}

// Cleanup
async function cleanup() {
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (err) {
    // Ignore cleanup errors
  }
}

test('IndexManager sorts by deadline correctly', async () => {
  await cleanup();

  const entries = [
    {
      job_id: '1',
      title: 'Job A',
      company: 'Company A',
      saved_at: '2024-12-20T10:00:00Z',
      application_deadline: '2024-12-25', // Soonest
      tags: [],
      metadata: { has_pdf: false, has_ai_summary: false, last_parsed: '2024-12-20T10:00:00Z', parser_version: '2.0.0' }
    },
    {
      job_id: '2',
      title: 'Job B',
      company: 'Company B',
      saved_at: '2024-12-21T10:00:00Z',
      application_deadline: '2025-01-15', // Later
      tags: [],
      metadata: { has_pdf: false, has_ai_summary: false, last_parsed: '2024-12-21T10:00:00Z', parser_version: '2.0.0' }
    },
    {
      job_id: '3',
      title: 'Job C',
      company: 'Company C',
      saved_at: '2024-12-22T10:00:00Z',
      application_deadline: null, // No deadline (should be last)
      tags: [],
      metadata: { has_pdf: false, has_ai_summary: false, last_parsed: '2024-12-22T10:00:00Z', parser_version: '2.0.0' }
    }
  ];

  await createTestIndex(entries);

  const manager = new IndexManager(indexPath);
  const loaded = await manager.readIndex();

  // Sort by deadline (urgent first)
  const sorted = loaded.sort((a, b) => {
    const deadlineA = a.application_deadline || '9999-12-31';
    const deadlineB = b.application_deadline || '9999-12-31';
    return deadlineA.localeCompare(deadlineB);
  });

  assert.equal(sorted[0].job_id, '1', 'Job with earliest deadline should be first');
  assert.equal(sorted[1].job_id, '2', 'Job with later deadline should be second');
  assert.equal(sorted[2].job_id, '3', 'Job with no deadline should be last');

  await cleanup();
});

test('IndexManager filters active jobs correctly', async () => {
  await cleanup();

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const entries = [
    {
      job_id: '1',
      title: 'Active Job',
      company: 'Company A',
      saved_at: '2024-12-20T10:00:00Z',
      application_deadline: tomorrow.toISOString().split('T')[0], // Future
      tags: [],
      metadata: { has_pdf: false, has_ai_summary: false, last_parsed: '2024-12-20T10:00:00Z', parser_version: '2.0.0' }
    },
    {
      job_id: '2',
      title: 'Expired Job',
      company: 'Company B',
      saved_at: '2024-12-21T10:00:00Z',
      application_deadline: yesterday.toISOString().split('T')[0], // Past
      tags: [],
      metadata: { has_pdf: false, has_ai_summary: false, last_parsed: '2024-12-21T10:00:00Z', parser_version: '2.0.0' }
    }
  ];

  await createTestIndex(entries);

  const manager = new IndexManager(indexPath);
  const loaded = await manager.readIndex();

  // Filter active jobs
  const active = loaded.filter(e =>
    e.application_deadline && new Date(e.application_deadline) > now
  );

  assert.equal(active.length, 1, 'Should have 1 active job');
  assert.equal(active[0].job_id, '1', 'Active job should be Job 1');

  // Filter expired jobs
  const expired = loaded.filter(e =>
    e.application_deadline && new Date(e.application_deadline) <= now
  );

  assert.equal(expired.length, 1, 'Should have 1 expired job');
  assert.equal(expired[0].job_id, '2', 'Expired job should be Job 2');

  await cleanup();
});

test('IndexManager filters by tag correctly', async () => {
  await cleanup();

  const entries = [
    {
      job_id: '1',
      title: 'Backend Job',
      company: 'Company A',
      saved_at: '2024-12-20T10:00:00Z',
      tags: ['backend', 'remote'],
      metadata: { has_pdf: false, has_ai_summary: false, last_parsed: '2024-12-20T10:00:00Z', parser_version: '2.0.0' }
    },
    {
      job_id: '2',
      title: 'Frontend Job',
      company: 'Company B',
      saved_at: '2024-12-21T10:00:00Z',
      tags: ['frontend'],
      metadata: { has_pdf: false, has_ai_summary: false, last_parsed: '2024-12-21T10:00:00Z', parser_version: '2.0.0' }
    },
    {
      job_id: '3',
      title: 'Another Backend Job',
      company: 'Company C',
      saved_at: '2024-12-22T10:00:00Z',
      tags: ['backend', 'senior'],
      metadata: { has_pdf: false, has_ai_summary: false, last_parsed: '2024-12-22T10:00:00Z', parser_version: '2.0.0' }
    }
  ];

  await createTestIndex(entries);

  const manager = new IndexManager(indexPath);
  const loaded = await manager.readIndex();

  // Filter by 'backend' tag
  const backendJobs = loaded.filter(e =>
    e.tags && e.tags.some(t => t.toLowerCase() === 'backend')
  );

  assert.equal(backendJobs.length, 2, 'Should have 2 backend jobs');
  assert.ok(backendJobs.find(j => j.job_id === '1'), 'Should include Job 1');
  assert.ok(backendJobs.find(j => j.job_id === '3'), 'Should include Job 3');

  // Filter by 'frontend' tag
  const frontendJobs = loaded.filter(e =>
    e.tags && e.tags.some(t => t.toLowerCase() === 'frontend')
  );

  assert.equal(frontendJobs.length, 1, 'Should have 1 frontend job');
  assert.equal(frontendJobs[0].job_id, '2', 'Should be Job 2');

  await cleanup();
});

test('IndexManager sorts by company alphabetically', async () => {
  await cleanup();

  const entries = [
    {
      job_id: '1',
      title: 'Job 1',
      company: 'Zebra Corp',
      saved_at: '2024-12-20T10:00:00Z',
      tags: [],
      metadata: { has_pdf: false, has_ai_summary: false, last_parsed: '2024-12-20T10:00:00Z', parser_version: '2.0.0' }
    },
    {
      job_id: '2',
      title: 'Job 2',
      company: 'Alpha Inc',
      saved_at: '2024-12-21T10:00:00Z',
      tags: [],
      metadata: { has_pdf: false, has_ai_summary: false, last_parsed: '2024-12-21T10:00:00Z', parser_version: '2.0.0' }
    },
    {
      job_id: '3',
      title: 'Job 3',
      company: 'Beta LLC',
      saved_at: '2024-12-22T10:00:00Z',
      tags: [],
      metadata: { has_pdf: false, has_ai_summary: false, last_parsed: '2024-12-22T10:00:00Z', parser_version: '2.0.0' }
    }
  ];

  await createTestIndex(entries);

  const manager = new IndexManager(indexPath);
  const loaded = await manager.readIndex();

  // Sort by company
  const sorted = loaded.sort((a, b) => a.company.localeCompare(b.company));

  assert.equal(sorted[0].company, 'Alpha Inc', 'Alpha should be first');
  assert.equal(sorted[1].company, 'Beta LLC', 'Beta should be second');
  assert.equal(sorted[2].company, 'Zebra Corp', 'Zebra should be last');

  await cleanup();
});

test('IndexManager handles empty index gracefully', async () => {
  await cleanup();

  await fs.mkdir(testDir, { recursive: true });
  await fs.writeFile(indexPath, '', 'utf-8'); // Empty file

  const manager = new IndexManager(indexPath);
  const entries = await manager.readIndex();

  assert.equal(entries.length, 0, 'Empty index should return empty array');

  await cleanup();
});
