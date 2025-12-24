# JobSnap

JobSnap saves a BDJobs job circular as a local snapshot: raw HTML, structured JSON, and clean Markdown. <br>

The CLI is the v0.1 focus. The extension is a minimal skeleton for later.

> Hurry up and save your JD before BDJobs asks you to purchase Pro version to read the JD again. Enjoy!

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

## Notes

- The CLI overwrites existing files for the same job ID.
- `job.md` is the primary artifact (LLM-friendly, stable headings).
- `raw.html` lets you re-parse later if the page format changes.
- `index.jsonl` is a lightweight catalog of saved jobs.

## Extension (skeleton)

The `extension/` folder contains a minimal MV3 extension that downloads a Markdown file
from the current BDJobs job page.

To load it in Chrome:

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click "Load unpacked" and select the `extension/` folder

The extension currently uses raw page text and will be upgraded later to share the core parser.

To use:

1. open open any BDJobs job circular link
2. from that tab click the JonSnap extention and click `Download Markdown`
3. enjoy! Hurry up and save your JD before BDJobs asks you to purchase Pro version to read the JD again!
