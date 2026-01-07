/**
 * index-manager.js - Manages the index.jsonl catalog file
 *
 * Provides utilities for reading, writing, and updating the index.jsonl
 * file with automatic v1.0 → v2.0 migration.
 */

import fs from 'fs/promises';
import path from 'path';
import { migrateIndexEntry, validateIndexEntry } from './schema.js';

export class IndexManager {
  /**
   * @param {string} indexPath - Full path to index.jsonl file
   */
  constructor(indexPath) {
    this.indexPath = indexPath;
  }

  /**
   * Reads all entries from index.jsonl with automatic v1.0 → v2.0 migration.
   *
   * @returns {Promise<Array>} - Array of index entries (v2.0 format)
   */
  async readIndex() {
    try {
      const content = await fs.readFile(this.indexPath, 'utf-8');

      return content
        .trim()
        .split('\n')
        .filter(line => line.trim()) // Skip empty lines
        .map(line => {
          const entry = JSON.parse(line);
          // Auto-migrate v1.0 entries to v2.0 on read
          return migrateIndexEntry(entry);
        });
    } catch (err) {
      if (err.code === 'ENOENT') {
        // Index file doesn't exist yet (first run)
        return [];
      }
      throw err;
    }
  }

  /**
   * Appends a new entry to index.jsonl.
   *
   * @param {Object} entry - Index entry (v2.0 format)
   */
  async appendEntry(entry) {
    // Validate before writing
    const validation = validateIndexEntry(entry);
    if (!validation.valid) {
      throw new Error(`Invalid index entry: ${validation.errors.join(', ')}`);
    }

    const line = JSON.stringify(entry) + '\n';

    // Ensure parent directory exists
    await fs.mkdir(path.dirname(this.indexPath), { recursive: true });

    await fs.appendFile(this.indexPath, line, 'utf-8');
  }

  /**
   * Updates an existing entry in index.jsonl.
   *
   * @param {string} jobId - Job ID to update
   * @param {Object} updates - Partial updates to apply
   */
  async updateEntry(jobId, updates) {
    const entries = await this.readIndex();
    const index = entries.findIndex(e => e.job_id === jobId);

    if (index === -1) {
      throw new Error(`Job ${jobId} not found in index`);
    }

    // Apply updates (supports nested paths like 'metadata.has_pdf')
    entries[index] = applyNestedUpdates(entries[index], updates);

    // Rewrite entire index
    await this.rewriteIndex(entries);
  }

  /**
   * Removes an entry from index.jsonl.
   *
   * @param {string} jobId - Job ID to remove
   */
  async removeEntry(jobId) {
    const entries = await this.readIndex();
    const filtered = entries.filter(e => e.job_id !== jobId);

    if (filtered.length === entries.length) {
      throw new Error(`Job ${jobId} not found in index`);
    }

    await this.rewriteIndex(filtered);
  }

  /**
   * Rewrites the entire index.jsonl file.
   *
   * @param {Array} entries - All entries to write
   */
  async rewriteIndex(entries) {
    // Validate all entries
    for (const entry of entries) {
      const validation = validateIndexEntry(entry);
      if (!validation.valid) {
        throw new Error(`Invalid entry ${entry.job_id}: ${validation.errors.join(', ')}`);
      }
    }

    const content = entries.map(e => JSON.stringify(e)).join('\n') + '\n';

    // Ensure parent directory exists
    await fs.mkdir(path.dirname(this.indexPath), { recursive: true });

    await fs.writeFile(this.indexPath, content, 'utf-8');
  }

  /**
   * Gets a single entry by job ID.
   *
   * @param {string} jobId - Job ID to find
   * @returns {Promise<Object|null>} - Entry or null if not found
   */
  async getEntry(jobId) {
    const entries = await this.readIndex();
    return entries.find(e => e.job_id === jobId) || null;
  }

  /**
   * Checks if an entry exists in the index.
   *
   * @param {string} jobId - Job ID to check
   * @returns {Promise<boolean>}
   */
  async hasEntry(jobId) {
    const entry = await this.getEntry(jobId);
    return entry !== null;
  }
}

/**
 * Applies nested updates to an object using dot notation.
 *
 * Example:
 *   applyNestedUpdates({ a: { b: 1 } }, { 'a.b': 2 })
 *   => { a: { b: 2 } }
 *
 * @param {Object} obj - Object to update
 * @param {Object} updates - Updates with dot-notation keys
 * @returns {Object} - Updated object
 */
function applyNestedUpdates(obj, updates) {
  const result = { ...obj };

  for (const [key, value] of Object.entries(updates)) {
    if (key.includes('.')) {
      // Nested path (e.g., 'metadata.has_pdf')
      const parts = key.split('.');
      let current = result;

      // Navigate to parent object
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!(part in current)) {
          current[part] = {};
        }
        current = current[part];
      }

      // Set value
      current[parts[parts.length - 1]] = value;
    } else {
      // Top-level key
      result[key] = value;
    }
  }

  return result;
}
