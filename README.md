# JobSnap — save the JD once, stop hunting it later

JobSnap snapshots a BDJobs circular to your disk (raw HTML, structured JSON, and clean Markdown) the moment you apply.  
The CLI is the v0.1 focus; the extension reuses the same parser.

## Requirements

- Node.js 18+ (tested with Node 22)

## Quick start (CLI)

From the repo root:

```bash
node ./cli/jobsnap.js save "https://bdjobs.com/jobs/details/1436685"
```

Or:

```bash
npm run jobsnap -- save "https://bdjobs.com/jobs/details/1436685"
```

Re-parse an existing snapshot (no re-download):

```bash
node ./cli/jobsnap.js reparse jobs/1436685
```

## Output (default)

```
jobs/
  index.jsonl
  <job_id>/
    raw.html
    job.json
    job.md
```

## Config

You can set an output directory in a local `.env` file:

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

## Extension (skeleton)

The `extension/` folder contains a minimal MV3 extension that downloads a Markdown file
from the current BDJobs job page using the same core parser.

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
2. Click the JobSnap extension and choose `Download Markdown`.
