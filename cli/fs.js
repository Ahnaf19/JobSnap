import fs from "node:fs/promises";

export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function writeText(filePath, text) {
  await fs.writeFile(filePath, text, "utf8");
}

export async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export async function updateIndex(indexPath, entry) {
  let lines = [];
  try {
    lines = (await fs.readFile(indexPath, "utf8"))
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    // ignore missing index
  }

  const kept = [];
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (obj?.job_id && obj.job_id === entry.job_id) continue;
      kept.push(JSON.stringify(obj));
    } catch {
      // ignore corrupt line
    }
  }

  kept.push(JSON.stringify(entry));
  await fs.writeFile(indexPath, kept.join("\n") + "\n", "utf8");
}

