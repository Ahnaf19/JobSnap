<div align="center">
  <img src="extension/img/icon-128.png" width="84" alt="JobSnap icon" />
  <h1>JobSnap</h1>
  <p>Save the JD once, stop hunting it later.</p>
  <p>
    <img src="https://img.shields.io/badge/version-v0.7.0-ff6a3d" alt="Version v0.7.0" />
    <img src="https://img.shields.io/badge/node-18%2B-3c873a?logo=node.js&logoColor=white" alt="Node 18+" />
    <img src="https://img.shields.io/badge/javascript-ES2022-f7df1e?logo=javascript&logoColor=000" alt="JavaScript ES2022" />
    <img src="https://img.shields.io/badge/extension-Chrome_MV3-4285f4?logo=googlechrome&logoColor=white" alt="Chrome MV3" />
  </p>
</div>

![JobSnap demo](assets/jobsnap-demo.gif)

JobSnap snapshots a BDJobs circular to your disk (raw HTML, structured JSON, and clean Markdown) the moment you apply.  
The CLI and extension share the same parser and output format.

## Why JobSnap

- Keep a reliable, offline copy of every JD you apply to.
- Get a clean Markdown version for notes, comparisons, and LLM workflows.
- Save once, revisit anytime without re-opening BDJobs.

## What you get

- `raw.html`: original snapshot
- `job.json`: structured fields
- `job.md`: clean, LLM-friendly Markdown
- `index.jsonl`: append-only catalog

## Requirements

- Node.js 18+ (tested with Node 22)

## Install

From source (repo):

```bash
npm install
```

NPM (global, from this repo):

```bash
npm install -g .
```

Single-file build (for sharing a one-file CLI):

```bash
npm run build:single
./dist/jobsnap.js --help
```

## Onboarding (3 steps)

1. Install (repo, global, or single-file).
2. Save one JD with the CLI or extension.
3. Reparse later from `raw.html` if the site changes.

## Quick start (CLI)

From the repo root:

```bash
node ./cli/jobsnap.js save "https://bdjobs.com/jobs/details/1436685"
```

Or:

```bash
npm run jobsnap -- save "https://bdjobs.com/jobs/details/1436685"
```

Global install:

```bash
jobsnap save "https://bdjobs.com/jobs/details/1436685"
```

Re-parse an existing snapshot (no re-download):

```bash
node ./cli/jobsnap.js reparse jobs/1436685
```

## Quick start (Extension)

1. Open `chrome://extensions`
2. Enable Developer mode
3. Load unpacked `extension/`
4. Open a BDJobs job page and click JobSnap

## CLI Reference (all options)

```
jobsnap save <bdjobs_url> [--out <dir>] [--skip] [--template <pattern>] [--dry-run]
jobsnap reparse <job_dir|raw_html> [--template <pattern>] [--dry-run]
jobsnap --help (-h)
```

- `--out <dir>`: output root folder (defaults to `jobs/`)
- `--skip`: do not overwrite if the job already exists
- `--template <pattern>`: filename template, e.g. `{title}_{company}_{job_id}.md`
- `--dry-run`: preview output paths without writing files
- `--help` / `-h`: show usage + examples

## CLI Usage (what it does)

Save a circular (fetch + parse + write `raw.html`, `job.json`, `job.md`, and update `index.jsonl`):

```bash
node ./cli/jobsnap.js save "https://bdjobs.com/jobs/details/1436685"
```

Re-parse an existing snapshot (reads `raw.html`, rebuilds `job.json` + `job.md`, updates `index.jsonl`):

```bash
node ./cli/jobsnap.js reparse jobs/1436685
```

Dry run (no writes, just shows planned output paths):

```bash
node ./cli/jobsnap.js save "https://bdjobs.com/jobs/details/1436685" --dry-run
node ./cli/jobsnap.js reparse jobs/1436685 --dry-run
```

Option examples:

```bash
node ./cli/jobsnap.js save "https://bdjobs.com/jobs/details/1436685" --out ./jobs
node ./cli/jobsnap.js save "https://bdjobs.com/jobs/details/1436685" --skip
node ./cli/jobsnap.js save "https://bdjobs.com/jobs/details/1436685" --template "{title}_{company}_{job_id}.md"
node ./cli/jobsnap.js reparse jobs/1436685/raw.html --template "{title}_{company}_{job_id}.md"
```

## Help

```bash
jobsnap --help
# or
node ./cli/jobsnap.js --help
# or
npm run jobsnap -- --help
```

## Error codes

- `2`: invalid arguments / missing inputs
- `3`: invalid `jobsnap.config.json`
- `4`: fetch failed
- `5`: parse failed
- `6`: write failed

## Output (default)

```
jobs/
  index.jsonl
  <job_id>/
    raw.html
    job.json
    job.md
```

## Output contract (v1.0 target)

`job.json` fields (stable):

- `job_id`, `url`, `saved_at`, `source`, `parser_version`
- `title`, `company`, `application_deadline`, `published`
- `summary`, `requirements`, `responsibilities_context`
- `skills_expertise`, `compensation_other_benefits`
- `read_before_apply`, `company_information`

`job.md` top-level headings (stable):

- Summary
- Requirements
- Responsibilities & Context
- Skills & Expertise
- Compensation & Other Benefits
- Read Before Apply
- Company Information
- Raw Text (fallback only)

## Config

You can set defaults in a local `jobsnap.config.json`:

```json
{
  "outputDir": "jobs",
  "skip": false,
  "template": "{title}_{company}_{job_id}.md",
  "dryRun": false
}
```

Minimal example:

```json
{
  "outputDir": "jobs"
}
```

Precedence: CLI flags > `jobsnap.config.json` > `.env` > default.

You can also set an output directory in a local `.env` file:

```
OUTPUT_DIR=jobs
```

Or override per run:

```bash
node ./cli/jobsnap.js save "https://bdjobs.com/jobs/details/1436685" --out ./jobs
```

Skip if already downloaded:

```bash
node ./cli/jobsnap.js save "https://bdjobs.com/jobs/details/1436685" --skip
```

## Notes

- The CLI overwrites existing files for the same job ID (unless `--skip` is used).
- `job.md` is the primary artifact (LLM-friendly, stable headings).
- `raw.html` lets you re-parse later if the page format changes.
- `index.jsonl` is a lightweight catalog of saved jobs.

## Tests

```bash
npm test
```

Fixture regression (only runs if `docs/fixtures/bdjobs/manifest.jsonl` exists):

```bash
node --test
```

## Release checklist (maintainers)

- `node --test` (unit + schema + fixtures)
- CLI smoke: `jobsnap save <url>` and `jobsnap reparse <job_dir>`
- Extension smoke: current tab + pasted URL, check filename parts + options

## Extension

The `extension/` folder contains a MV3 extension that downloads a Markdown file
from the current BDJobs job page or a pasted URL using the same core parser.

To load it in Chrome:

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click "Load unpacked" and select the `extension/` folder

If you change files in `core/`, sync them into the extension before reloading:

```bash
npm run sync-extension
```

To use:

1. Open a BDJobs job circular link.
2. Click the JobSnap extension and choose `Download from current tab`.

Or:

1. Paste a BDJobs job details link into the popup.
2. Click `Download from URL`.

Filename template:

1. Pick the filename parts (Title, Company, Job ID) in the popup.
2. JobSnap uses a fixed order: title -> company -> job id.

Defaults:

1. Open the extension options page (chrome://extensions → JobSnap → Details → Extension options).
2. The popup uses those defaults on new installs.

## Roadmap (v2.0 preview)

- LLM summary (must-haves vs nice-to-haves)
- CV comparison + gap analysis
- Local search/tagging across saved JDs
