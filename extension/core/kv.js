import { normalizeWhitespace, toKey } from './strings.js';

export function extractLabelValuePairs(text) {
  const input = normalizeWhitespace(text);
  if (!input) return {};

  const matches = [...input.matchAll(/([A-Za-z][A-Za-z &/]+)\s*:\s*/g)];
  if (matches.length === 0) return {};

  const result = {};
  for (let i = 0; i < matches.length; i += 1) {
    const label = matches[i][1].trim();
    const valueStart = matches[i].index + matches[i][0].length;
    const valueEnd = i + 1 < matches.length ? matches[i + 1].index : input.length;
    const value = input.slice(valueStart, valueEnd).trim();
    if (!label || !value) continue;
    const key = toKey(label);
    if (!key) continue;
    result[key] = value;
  }

  return result;
}

export function extractDetailsFromLines(text, { skipHeadings = [] } = {}) {
  const input = normalizeWhitespace(text);
  if (!input) return {};

  const skipSet = new Set(skipHeadings.map((h) => h.toLowerCase()));
  const lines = input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const result = {};
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const lower = line.toLowerCase();

    if (skipSet.has(lower)) continue;
    if (line.startsWith('- ')) continue;

    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const label = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      if (label && value) {
        const key = toKey(label);
        if (key) result[key] = value;
        continue;
      }
    }

    const next = lines[i + 1];
    if (!next || next.startsWith('- ')) continue;
    if (skipSet.has(next.toLowerCase())) continue;
    if (line.length > 40) continue;

    const key = toKey(line);
    if (key && !result[key]) {
      result[key] = next;
      i += 1;
    }
  }

  return result;
}
