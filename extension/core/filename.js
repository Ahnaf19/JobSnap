import { sanitizeFilenameSegment } from './strings.js';

export const DEFAULT_FILENAME_TEMPLATE = '{title}_{company}_{job_id}.md';

function normalizeTemplate(template) {
  const trimmed = String(template ?? '').trim();
  return trimmed || DEFAULT_FILENAME_TEMPLATE;
}

function sanitizeTemplateOutput(value) {
  return String(value ?? '')
    .replace(/[\\/]+/g, '_')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function buildFilename({ template, title, company, jobId } = {}) {
  const safeTitle = sanitizeFilenameSegment(title || 'job');
  const safeCompany = sanitizeFilenameSegment(company || 'unknown');
  const safeJobId = sanitizeFilenameSegment(jobId || 'unknown');

  let result = normalizeTemplate(template)
    .replaceAll('{title}', safeTitle)
    .replaceAll('{company}', safeCompany)
    .replaceAll('{job_id}', safeJobId);

  result = sanitizeTemplateOutput(result);
  if (!result) result = 'job';
  if (!result.toLowerCase().endsWith('.md')) result += '.md';
  return result;
}
