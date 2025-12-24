import fs from "node:fs/promises";

function stripQuotes(value) {
  const trimmed = String(value ?? "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export async function loadDotEnv(dotEnvPath) {
  try {
    const raw = await fs.readFile(dotEnvPath, "utf8");
    const env = {};
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const value = stripQuotes(trimmed.slice(idx + 1));
      if (!key) continue;
      env[key] = value;
    }
    return env;
  } catch {
    return {};
  }
}

