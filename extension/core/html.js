import { normalizeWhitespace } from "./strings.js";

function decodeHtmlEntities(text) {
  return String(text ?? "")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&#x27;", "'");
}

export function extractTitleTag(html) {
  const match = String(html ?? "").match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return null;
  return normalizeWhitespace(decodeHtmlEntities(match[1]));
}

export function htmlToText(html) {
  let text = String(html ?? "");
  text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "\n");
  text = text.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "\n");

  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/(p|div|section|article|header|footer|tr|table|ul|ol|h[1-6])>/gi, "\n");
  text = text.replace(/<(li)\b[^>]*>/gi, "\n- ");
  text = text.replace(/<\/li>/gi, "");

  text = text.replace(/<[^>]+>/g, " ");
  text = decodeHtmlEntities(text);
  return normalizeWhitespace(text);
}

