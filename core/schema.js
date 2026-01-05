/**
 * schema.js - JobSnap Schema Definitions
 *
 * v1.0: Basic job.json schema validation
 * v2.0: Extended with index.jsonl schema and migration utilities
 */

// =============================================================================
// v1.0 Schema (Backward Compatible)
// =============================================================================

export const REQUIRED_FIELDS = [
  "job_id",
  "url",
  "saved_at",
  "source",
  "parser_version",
  "title",
  "company",
  "summary",
  "requirements",
  "responsibilities_context",
  "company_information"
];

export const MD_HEADINGS = [
  "Summary",
  "Requirements",
  "Responsibilities & Context",
  "Skills & Expertise",
  "Compensation & Other Benefits",
  "Read Before Apply",
  "Company Information",
  "Raw Text"
];

export function validateJobSchema(job) {
  const errors = [];
  if (!job || typeof job !== "object") {
    return { ok: false, errors: ["job must be an object"] };
  }

  for (const field of REQUIRED_FIELDS) {
    const value = job[field];
    if (value === null || value === undefined) {
      errors.push(`missing ${field}`);
      continue;
    }
    if (typeof value === "string" && value.trim().length === 0) {
      errors.push(`empty ${field}`);
      continue;
    }
    if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) {
      errors.push(`empty ${field}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

// =============================================================================
// v2.0 Schema Extensions
// =============================================================================

/**
 * index.jsonl Schema (v2.0)
 *
 * Each line in index.jsonl represents one saved job.
 * v2.0 adds metadata fields while maintaining v1.0 compatibility.
 */
export const INDEX_SCHEMA_V2 = {
  required: ['job_id', 'title', 'company', 'saved_at'],
  optional: ['application_deadline', 'published', 'tags', 'metadata']
};

/**
 * Migrates a v1.0 index entry to v2.0 format.
 *
 * @param {Object} v1Entry - Legacy index entry from v1.0
 * @returns {Object} - Migrated entry with v2.0 fields
 */
export function migrateIndexEntry(v1Entry) {
  // If already has metadata, it's already v2.0
  if (v1Entry.metadata) {
    return v1Entry;
  }

  // Migrate v1.0 entry to v2.0
  return {
    ...v1Entry,
    tags: v1Entry.tags || [],
    metadata: {
      has_pdf: false,
      has_ai_summary: false,
      last_parsed: v1Entry.saved_at,
      parser_version: v1Entry.parser_version || '1.0.0'
    }
  };
}

/**
 * Validates an index entry against the v2.0 schema.
 *
 * @param {Object} entry - Index entry to validate
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export function validateIndexEntry(entry) {
  const errors = [];

  // Check required fields
  for (const field of INDEX_SCHEMA_V2.required) {
    if (!(field in entry) || entry[field] === null || entry[field] === undefined) {
      errors.push(`missing ${field}`);
    }
  }

  // Validate tags (if present)
  if ('tags' in entry && !Array.isArray(entry.tags)) {
    errors.push('tags must be an array');
  }

  // Validate metadata (if present)
  if ('metadata' in entry && typeof entry.metadata !== 'object') {
    errors.push('metadata must be an object');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Creates a v2.0-compatible index entry from a job object.
 *
 * @param {Object} job - Full job object (from job.json)
 * @returns {Object} - Minimal index entry
 */
export function createIndexEntry(job) {
  return {
    job_id: job.job_id,
    title: job.title,
    company: job.company,
    saved_at: job.saved_at,
    application_deadline: job.application_deadline || null,
    published: job.published || null,
    tags: job.metadata?.tags || [],
    metadata: {
      has_pdf: false,
      has_ai_summary: false,
      last_parsed: job.saved_at,
      parser_version: job.parser_version
    }
  };
}
