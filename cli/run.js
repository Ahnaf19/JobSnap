import path from "node:path";

import { loadDotEnv } from "./env.js";
import { saveJobSnapshot } from "./save.js";

const DEFAULT_OUTPUT_DIR = "jobs";

function printHelp() {
  // eslint-disable-next-line no-console
  console.log(`
JobSnap (v0.1)

Usage:
  jobsnap save <bdjobs_url> [--out <dir>]

Examples:
  jobsnap save "https://bdjobs.com/jobs/details/1436685"
  jobsnap save "https://bdjobs.com/jobs/details/1436685" --out ./jobs

Config:
  - Optional .env at repo root with OUTPUT_DIR=...
`);
}

function parseArgs(argv) {
  const args = [...argv];
  const result = { _: [] };

  while (args.length) {
    const token = args.shift();
    if (!token) break;
    if (token === "--help" || token === "-h") {
      result.help = true;
      continue;
    }
    if (token === "--out") {
      result.out = args.shift();
      continue;
    }
    result._.push(token);
  }

  return result;
}

export async function runCli(argv, { projectRoot = process.cwd() } = {}) {
  const parsed = parseArgs(argv);
  if (parsed.help) {
    printHelp();
    return 0;
  }

  const [command, ...rest] = parsed._;
  if (!command) {
    printHelp();
    return 1;
  }

  if (command !== "save") {
    // eslint-disable-next-line no-console
    console.error(`Unknown command: ${command}`);
    printHelp();
    return 1;
  }

  const url = rest[0];
  if (!url) {
    // eslint-disable-next-line no-console
    console.error("Missing URL.");
    printHelp();
    return 1;
  }

  const env = await loadDotEnv(path.join(projectRoot, ".env"));
  const outputRoot = path.resolve(projectRoot, parsed.out ?? env.OUTPUT_DIR ?? DEFAULT_OUTPUT_DIR);

  try {
    const result = await saveJobSnapshot({ url, outputRoot });
    // eslint-disable-next-line no-console
    console.log(`Saved: ${path.relative(process.cwd(), result.jobDir)}`);
    // eslint-disable-next-line no-console
    console.log(`Markdown: ${path.relative(process.cwd(), result.mdPath)}`);
    // eslint-disable-next-line no-console
    console.log(`Index: ${path.relative(process.cwd(), result.indexPath)}`);
    return 0;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(String(err?.message ?? err));
    return 1;
  }
}

