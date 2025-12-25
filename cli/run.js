import path from "node:path";

import { loadConfig } from "./config.js";
import { loadDotEnv } from "./env.js";
import { CliError, ExitCode } from "./errors.js";
import { reparseJobSnapshot } from "./reparse.js";
import { saveJobSnapshot } from "./save.js";

const DEFAULT_OUTPUT_DIR = "jobs";

function printHelp() {
  // eslint-disable-next-line no-console
  console.log(`
JobSnap (v0.3)

Usage:
  jobsnap save <bdjobs_url> [--out <dir>] [--skip] [--template <pattern>]
  jobsnap reparse <job_dir|raw_html> [--template <pattern>]

Examples:
  jobsnap save "https://bdjobs.com/jobs/details/1436685"
  jobsnap save "https://bdjobs.com/jobs/details/1436685" --out ./jobs
  jobsnap save "https://bdjobs.com/jobs/details/1436685" --skip
  jobsnap save "https://bdjobs.com/jobs/details/1436685" --template "{title}_{company}_{job_id}.md"
  jobsnap reparse jobs/1436685 --template "{title}_{company}_{job_id}.md"
  jobsnap reparse jobs/1436685/raw.html

Config:
  - Optional .env at repo root with OUTPUT_DIR=...
  - Optional jobsnap.config.json with outputDir, skip, template
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
    if (token === "--template" || token === "--name") {
      result.template = args.shift();
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
    return ExitCode.OK;
  }

  const [command, ...rest] = parsed._;
  if (!command) {
    printHelp();
    return ExitCode.INVALID_ARGS;
  }

  try {
    const config = await loadConfig(projectRoot);
    const configOutput = typeof config.outputDir === "string" ? config.outputDir : null;
    const configTemplate = typeof config.template === "string" ? config.template : null;
    const configSkip = config.skip === true || config.skip === "true";
    if (command === "save") {
      const url = rest[0];
      if (!url) {
        // eslint-disable-next-line no-console
        console.error("Missing URL.");
        printHelp();
        return ExitCode.INVALID_ARGS;
      }

      const env = await loadDotEnv(path.join(projectRoot, ".env"));
      const outputRoot = path.resolve(
        projectRoot,
        parsed.out ?? configOutput ?? env.OUTPUT_DIR ?? DEFAULT_OUTPUT_DIR
      );
      const skipExisting = parsed.skip ?? configSkip ?? false;
      const filenameTemplate = parsed.template ?? configTemplate ?? null;

      const result = await saveJobSnapshot({
        url,
        outputRoot,
        skipExisting,
        filenameTemplate
      });
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
        return ExitCode.INVALID_ARGS;
      }

      const filenameTemplate = parsed.template ?? configTemplate ?? null;
      const result = await reparseJobSnapshot({ targetPath, filenameTemplate });
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
    return ExitCode.INVALID_ARGS;
  } catch (err) {
    if (err instanceof CliError) {
      // eslint-disable-next-line no-console
      console.error(err.message);
      return err.code ?? ExitCode.UNKNOWN;
    }
    // eslint-disable-next-line no-console
    console.error(String(err?.message ?? err));
    return ExitCode.UNKNOWN;
  }
}
