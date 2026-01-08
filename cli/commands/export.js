/**
 * export.js - Export saved jobs to PDF or HTML
 */

import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { IndexManager } from '../../core/index-manager.js';

/**
 * Export a saved job to PDF or HTML
 *
 * @param {string} jobDir - Path to job directory (e.g., 'jobs/1436685')
 * @param {Object} options - Command options
 * @param {string} options.format - Export format: 'pdf' or 'html' (default: 'pdf')
 */
export async function exportCommand(jobDir, options = {}) {
  const format = options.format || 'pdf';

  // Validate job directory exists
  try {
    const stat = await fs.stat(jobDir);
    if (!stat.isDirectory()) {
      throw new Error(`Not a directory: ${jobDir}`);
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(chalk.red(`✗ Job directory not found: ${jobDir}`));
      console.error(chalk.gray('  Usage: jobsnap export <job_dir>'));
      process.exit(1);
    }
    throw err;
  }

  // Read job.json
  const jsonPath = path.join(jobDir, 'job.json');

  let jobData;
  try {
    jobData = JSON.parse(await fs.readFile(jsonPath, 'utf-8'));
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(chalk.red('✗ Missing required file: job.json'));
      console.error(chalk.gray('  Make sure the job directory contains job.json'));
      process.exit(1);
    }
    throw err;
  }

  // Find the Markdown file (could be job.md or custom template name)
  const files = await fs.readdir(jobDir);
  const mdFile = files.find(f => f.endsWith('.md'));

  if (!mdFile) {
    console.error(chalk.red(`✗ No Markdown file found in ${jobDir}`));
    console.error(chalk.gray('  Make sure the job directory contains a .md file'));
    process.exit(1);
  }

  const mdPath = path.join(jobDir, mdFile);
  let mdContent;

  try {
    mdContent = await fs.readFile(mdPath, 'utf-8');
  } catch (err) {
    console.error(chalk.red(`✗ Could not read Markdown file: ${mdFile}`));
    throw err;
  }

  // Strip frontmatter and duplicate metadata from Markdown
  const cleanedMd = stripMetadata(mdContent);

  // Convert Markdown to HTML
  const html = await renderHTML(cleanedMd, jobData);

  if (format === 'html') {
    // Save HTML
    const htmlPath = path.join(jobDir, 'job.html');
    await fs.writeFile(htmlPath, html, 'utf-8');
    console.log(chalk.green(`✓ HTML saved: ${path.relative(process.cwd(), htmlPath)}`));
    return;
  }

  // Generate PDF (requires Puppeteer)
  try {
    const puppeteer = await import('puppeteer');
    const pdfPath = path.join(jobDir, 'job.pdf');

    console.log(chalk.gray('Launching browser...'));
    const browser = await puppeteer.default.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    console.log(chalk.gray('Generating PDF...'));
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      printBackground: true
    });

    await browser.close();

    console.log(chalk.green(`✓ PDF saved: ${path.relative(process.cwd(), pdfPath)}`));

    // Update index.jsonl metadata
    const indexPath = path.join(path.dirname(jobDir), 'index.jsonl');
    try {
      const manager = new IndexManager(indexPath);
      await manager.updateEntry(jobData.job_id, {
        'metadata.has_pdf': true
      });
      console.log(chalk.gray('  Updated index.jsonl metadata'));
    } catch (err) {
      // Non-fatal: index update failed
      console.warn(chalk.yellow(`⚠ Could not update index metadata: ${err.message}`));
    }
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND') {
      // Puppeteer not installed
      console.error(chalk.red('✗ Puppeteer not installed'));
      console.error(chalk.yellow('\nTo generate PDFs, install Puppeteer:'));
      console.error(chalk.gray('  npm install puppeteer'));
      console.error(chalk.yellow('\nAlternatively, export to HTML:'));
      console.error(chalk.gray('  jobsnap export <job_dir> --format html'));
      process.exit(1);
    }
    throw err;
  }
}

/**
 * Strips frontmatter and duplicate metadata from Markdown
 *
 * @param {string} markdown - Raw Markdown content
 * @returns {string} - Cleaned Markdown without frontmatter/metadata
 */
function stripMetadata(markdown) {
  let lines = markdown.split('\n');

  // Remove YAML frontmatter (between --- delimiters)
  if (lines[0] === '---') {
    const endIndex = lines.slice(1).findIndex(line => line === '---');
    if (endIndex !== -1) {
      lines = lines.slice(endIndex + 2); // Skip past second ---
    }
  }

  // Remove leading empty lines
  while (lines.length > 0 && lines[0].trim() === '') {
    lines.shift();
  }

  // Remove title heading (# Title)
  if (lines.length > 0 && lines[0].startsWith('# ')) {
    lines.shift();
  }

  // Remove leading empty lines again
  while (lines.length > 0 && lines[0].trim() === '') {
    lines.shift();
  }

  // Remove **Company:** and **Application Deadline:** lines (with surrounding empty lines)
  while (lines.length > 0 && (lines[0].startsWith('**Company:**') || lines[0].startsWith('**Application Deadline:**') || lines[0].trim() === '')) {
    lines.shift();
  }

  return lines.join('\n').trim();
}

/**
 * Formats a date string consistently
 *
 * @param {string} dateString - ISO or human-readable date string
 * @returns {string} - Formatted date (e.g., "1/8/2026")
 */
function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  } catch (err) {
    return dateString;
  }
}

/**
 * Converts Markdown to HTML with styling
 *
 * @param {string} markdown - Job Markdown content
 * @param {Object} jobData - Job JSON data
 * @returns {Promise<string>} - HTML string
 */
async function renderHTML(markdown, jobData) {
  // Simple Markdown to HTML conversion
  // For now, we'll use basic regex replacements
  // In the future, could use a library like 'marked'
  let html = markdown;

  // Convert headings
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Convert bold/italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Convert lists
  html = html.replace(/^\* (.+$)/gim, '<li>$1</li>');
  html = html.replace(/^- (.+$)/gim, '<li>$1</li>');

  // Wrap list items in <ul>
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Convert line breaks to paragraphs
  html = html.split('\n\n').map(para => {
    if (para.startsWith('<h') || para.startsWith('<ul')) {
      return para;
    }
    return `<p>${para.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${jobData.title} - ${jobData.company}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
      background: #fff;
    }
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
      margin-top: 0;
    }
    h2 {
      color: #34495e;
      margin-top: 30px;
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 5px;
    }
    h3 {
      color: #555;
      margin-top: 20px;
    }
    ul {
      padding-left: 25px;
      margin: 10px 0;
    }
    li {
      margin: 8px 0;
    }
    .metadata {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 30px;
      font-size: 14px;
      border-left: 4px solid #3498db;
    }
    .metadata strong {
      color: #555;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #999;
      text-align: center;
    }
    @media print {
      body {
        max-width: 100%;
      }
      .metadata {
        page-break-inside: avoid;
      }
      h2 {
        page-break-after: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="metadata">
    <strong>Job ID:</strong> ${jobData.job_id} &nbsp;&nbsp;
    <strong>Company:</strong> ${jobData.company} &nbsp;&nbsp;
    <strong>Saved:</strong> ${formatDate(jobData.saved_at)}
    ${jobData.application_deadline ? ` &nbsp;&nbsp; <strong>Deadline:</strong> ${formatDate(jobData.application_deadline)}` : ''}
    ${jobData.published ? ` &nbsp;&nbsp; <strong>Published:</strong> ${formatDate(jobData.published)}` : ''}
  </div>

  <h1>${jobData.title}</h1>

  ${html}

  <div class="footer">
    Generated by JobSnap v2.0 &bull; ${new Date().toLocaleDateString()}
  </div>
</body>
</html>
`;
}
