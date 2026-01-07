import path from 'node:path';

import { loadConfig } from './config.js';
import { loadDotEnv } from './env.js';
import { CliError, ExitCode } from './errors.js';
import { reparseJobSnapshot } from './reparse.js';
import { saveJobSnapshot } from './save.js';

const DEFAULT_OUTPUT_DIR = 'jobs';

function printHelp() {
  // eslint-disable-next-line no-console
  console.log(`
JobSnap CLI

Usage:
  jobsnap save <bdjobs_url> [--out <dir>] [--skip] [--template <pattern>] [--dry-run]
  jobsnap reparse <job_dir|raw_html> [--template <pattern>] [--dry-run]

Examples:
  jobsnap save "https://bdjobs.com/jobs/details/1436685"
  jobsnap save "https://bdjobs.com/jobs/details/1436685" --out ./jobs
  jobsnap save "https://bdjobs.com/jobs/details/1436685" --skip
  jobsnap save "https://bdjobs.com/jobs/details/1436685" --template "{title}_{company}_{job_id}.md"
  jobsnap save "https://bdjobs.com/jobs/details/1436685" --dry-run
  jobsnap reparse jobs/1436685 --template "{title}_{company}_{job_id}.md"
  jobsnap reparse jobs/1436685/raw.html
  jobsnap reparse jobs/1436685 --dry-run

Config:
  - Optional .env at repo root with OUTPUT_DIR=...
  - Optional jobsnap.config.json with outputDir, skip, template, dryRun
`);
}

function parseArgs(argv) {
  const args = [...argv];
  const result = { _: [] };

  while (args.length) {
    const token = args.shift();
    if (!token) break;
    if (token === '--help' || token === '-h') {
      result.help = true;
      continue;
    }
    if (token === '--out') {
      const value = args.shift();
      if (!value || value.startsWith('-')) {
        result.error = 'Missing value for --out.';
        break;
      }
      result.out = value;
      continue;
    }
    if (token === '--template' || token === '--name') {
      const value = args.shift();
      if (!value || value.startsWith('-')) {
        result.error = 'Missing value for --template.';
        break;
      }
      result.template = value;
      continue;
    }
    if (token === '--skip' || token === '--skip-existing') {
      result.skip = true;
      continue;
    }
    if (token === '--dry-run') {
      result.dryRun = true;
      continue;
    }
    result._.push(token);
  }

  return result;
}

export async function runCli(argv, { projectRoot = process.cwd() } = {}) {
  const parsed = parseArgs(argv);
  if (parsed.error) {
    // eslint-disable-next-line no-console
    console.error(parsed.error);
    printHelp();
    return ExitCode.INVALID_ARGS;
  }
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
    const configOutput = typeof config.outputDir === 'string' ? config.outputDir : null;
    const configTemplate = typeof config.template === 'string' ? config.template : null;
    const configSkip = config.skip === true || config.skip === 'true';
    const configDryRun = config.dryRun === true || config.dryRun === 'true';
    if (command === 'save') {
      const url = rest[0];
      if (!url) {
        // eslint-disable-next-line no-console
        console.error('Missing URL.');
        printHelp();
        return ExitCode.INVALID_ARGS;
      }

      const env = await loadDotEnv(path.join(projectRoot, '.env'));
      const outputRoot = path.resolve(
        projectRoot,
        parsed.out ?? configOutput ?? env.OUTPUT_DIR ?? DEFAULT_OUTPUT_DIR
      );
      const skipExisting = parsed.skip ?? configSkip ?? false;
      const filenameTemplate = parsed.template ?? configTemplate ?? null;
      const dryRun = parsed.dryRun ?? configDryRun ?? false;

      const result = await saveJobSnapshot({
        url,
        outputRoot,
        skipExisting,
        filenameTemplate,
        dryRun
      });
      const statusLabel = dryRun ? 'Dry run' : result.skipped ? 'Skipped' : 'Saved';
      // eslint-disable-next-line no-console
      console.log(`${statusLabel}: ${path.relative(process.cwd(), result.jobDir)}`);
      // eslint-disable-next-line no-console
      console.log(`${dryRun ? 'Markdown (preview)' : 'Markdown'}: ${path.relative(process.cwd(), result.mdPath)}`);
      // eslint-disable-next-line no-console
      console.log(`${dryRun ? 'Index (preview)' : 'Index'}: ${path.relative(process.cwd(), result.indexPath)}`);
      return 0;
    }

    if (command === 'reparse') {
      const targetPath = rest[0];
      if (!targetPath) {
        // eslint-disable-next-line no-console
        console.error('Missing job directory or raw.html path.');
        printHelp();
        return ExitCode.INVALID_ARGS;
      }

      const filenameTemplate = parsed.template ?? configTemplate ?? null;
      const dryRun = parsed.dryRun ?? configDryRun ?? false;
      const result = await reparseJobSnapshot({ targetPath, filenameTemplate, dryRun });
      const statusLabel = dryRun ? 'Dry run' : 'Reparsed';
      // eslint-disable-next-line no-console
      console.log(`${statusLabel}: ${path.relative(process.cwd(), result.jobDir)}`);
      // eslint-disable-next-line no-console
      console.log(`${dryRun ? 'Markdown (preview)' : 'Markdown'}: ${path.relative(process.cwd(), result.mdPath)}`);
      // eslint-disable-next-line no-console
      console.log(`${dryRun ? 'Index (preview)' : 'Index'}: ${path.relative(process.cwd(), result.indexPath)}`);
      return 0;
    }

    // eslint-disable-next-line no-console
    console.error(`Unknown command: ${command}. Use --help for usage.`);
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
