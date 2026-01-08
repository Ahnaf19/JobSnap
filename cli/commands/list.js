/**
 * list.js - List saved jobs with sorting and filtering
 */

import path from 'path';
import chalk from 'chalk';
import { IndexManager } from '../../core/index-manager.js';

/**
 * List all saved jobs with optional sorting and filtering
 *
 * @param {Object} options - Command options
 * @param {string} options.outputDir - Jobs directory (default: 'jobs')
 * @param {string} options.by - Sort by: 'saved', 'deadline', 'company' (default: 'saved')
 * @param {boolean} options.active - Show only active jobs (deadline in future)
 * @param {boolean} options.expired - Show only expired jobs (deadline passed)
 * @param {string} options.tag - Filter by tag
 */
export async function listCommand(options = {}) {
  const outputDir = options.outputDir || 'jobs';
  const indexPath = path.join(outputDir, 'index.jsonl');

  const manager = new IndexManager(indexPath);
  let entries = await manager.readIndex();

  // Apply filters
  if (options.active) {
    const now = new Date();
    entries = entries.filter(e =>
      e.application_deadline && new Date(e.application_deadline) > now
    );
  }

  if (options.expired) {
    const now = new Date();
    entries = entries.filter(e =>
      e.application_deadline && new Date(e.application_deadline) <= now
    );
  }

  if (options.tag) {
    const tag = options.tag.toLowerCase();
    entries = entries.filter(e =>
      e.tags && e.tags.some(t => t.toLowerCase() === tag)
    );
  }

  // Apply sorting
  const sortBy = options.by || 'saved';

  if (sortBy === 'deadline') {
    entries.sort((a, b) => {
      // Parse dates for proper chronological sorting
      const dateA = a.application_deadline ? new Date(a.application_deadline) : new Date('9999-12-31');
      const dateB = b.application_deadline ? new Date(b.application_deadline) : new Date('9999-12-31');
      return dateA - dateB; // Earliest deadline first
    });
  } else if (sortBy === 'company') {
    entries.sort((a, b) => a.company.localeCompare(b.company));
  } else {
    // Default: newest first
    entries.sort((a, b) => b.saved_at.localeCompare(a.saved_at));
  }

  // Render output
  if (entries.length === 0) {
    console.log(chalk.yellow('\nNo jobs found matching the criteria.'));
    console.log(chalk.gray('Tip: Run \'jobsnap save <url>\' to save your first job.\n'));
    return;
  }

  console.log(chalk.bold(`\n${entries.length} job${entries.length === 1 ? '' : 's'} found\n`));

  entries.forEach(entry => {
    const deadline = entry.application_deadline
      ? formatDeadline(entry.application_deadline)
      : chalk.gray('No deadline');

    const tags = entry.tags && entry.tags.length > 0
      ? chalk.cyan(entry.tags.map(t => `#${t}`).join(' '))
      : '';

    console.log(
      `${chalk.green(entry.job_id.padEnd(10))}${chalk.bold(entry.title)}\n` +
      `${' '.repeat(10)}${chalk.gray(entry.company)}  ${deadline}  ${tags}\n`
    );
  });
}

/**
 * Formats a deadline with color coding based on urgency
 *
 * @param {string} deadline - ISO 8601 date string
 * @returns {string} - Formatted deadline with color
 */
function formatDeadline(deadline) {
  const date = new Date(deadline);
  const now = new Date();
  const daysLeft = Math.ceil((date - now) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    const daysAgo = Math.abs(daysLeft);
    return chalk.red(`Expired ${daysAgo}d ago`);
  } else if (daysLeft === 0) {
    return chalk.yellow.bold('Today!');
  } else if (daysLeft === 1) {
    return chalk.yellow('Tomorrow');
  } else if (daysLeft <= 3) {
    return chalk.yellow(`${daysLeft}d left`);
  } else if (daysLeft <= 7) {
    return chalk.green(`${daysLeft}d left`);
  } else {
    return chalk.gray(`${daysLeft}d left`);
  }
}
