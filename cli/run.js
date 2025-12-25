import path from "node:path";

import { loadDotEnv } from "./env.js";
import { reparseJobSnapshot } from "./reparse.js";
import { saveJobSnapshot } from "./save.js";

const DEFAULT_OUTPUT_DIR = "jobs";

function printHelp() {
  // eslint-disable-next-line no-console
  console.log(`
JobSnap (v0.1)

Usage:
  jobsnap save <bdjobs_url> [--out <dir>] [--skip]
  jobsnap reparse <job_dir|raw_html>

Examples:
  jobsnap save "https://bdjobs.com/jobs/details/1436685"
  jobsnap save "https://bdjobs.com/jobs/details/1436685" --out ./jobs
  jobsnap save "https://bdjobs.com/jobs/details/1436685" --skip
  jobsnap reparse jobs/1436685
  jobsnap reparse jobs/1436685/raw.html

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
    if (token === "--skip" || token === "--skip-existing") {
      result.skip = true;
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

  try {
    if (command === "save") {
      const url = rest[0];
      if (!url) {
        // eslint-disable-next-line no-console
        console.error("Missing URL.");
        printHelp();
        return 1;
      }

      const env = await loadDotEnv(path.join(projectRoot, ".env"));
      const outputRoot = path.resolve(projectRoot, parsed.out ?? env.OUTPUT_DIR ?? DEFAULT_OUTPUT_DIR);

      const result = await saveJobSnapshot({ url, outputRoot, skipExisting: parsed.skip });
      // eslint-disable-next-line no-console
      console.log(`${result.skipped ? "Skipped" : "Saved"}: ${path.relative(process.cwd(), result.jobDir)}`);
      // eslint-disable-next-line no-console
      console.log(`Markdown: ${path.relative(process.cwd(), result.mdPath)}`);
      // eslint-disable-next-line no-console
      console.log(`Index: ${path.relative(process.cwd(), result.indexPath)}`);
      return 0;
    }

    if (command === "reparse") {
      const targetPath = rest[0];
      if (!targetPath) {
        // eslint-disable-next-line no-console
        console.error("Missing job directory or raw.html path.");
        printHelp();
        return 1;
      }

      const result = await reparseJobSnapshot({ targetPath });
      // eslint-disable-next-line no-console
      console.log(`Reparsed: ${path.relative(process.cwd(), result.jobDir)}`);
      // eslint-disable-next-line no-console
      console.log(`Markdown: ${path.relative(process.cwd(), result.mdPath)}`);
      // eslint-disable-next-line no-console
      console.log(`Index: ${path.relative(process.cwd(), result.indexPath)}`);
      return 0;
    }

    // eslint-disable-next-line no-console
    console.error(`Unknown command: ${command}`);
    printHelp();
    return 1;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(String(err?.message ?? err));
    return 1;
  }
}
