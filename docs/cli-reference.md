# CLI Reference

Complete command-line reference for JobSnap.

---

## Command Invocation Methods

JobSnap CLI can be invoked in three ways, depending on how you've installed it:

| Method                      | When to Use                               | Command Format                              |
| --------------------------- | ----------------------------------------- | ------------------------------------------- |
| **`jobsnap`**               | After global install (`npm install -g .`) | `jobsnap <command> [options]`               |
| **`npm run jobsnap --`**    | From repo without global install          | `npm run jobsnap -- <command> [options]`    |
| **`node ./cli/jobsnap.js`** | Direct invocation from repo               | `node ./cli/jobsnap.js <command> [options]` |

**Recommended:** Use global install (`jobsnap`) for daily use. Examples below use this format.

---

## Commands

### `save`

Fetch a BDJobs circular and save it locally.

**Usage:**

```bash
jobsnap save <bdjobs_url> [options]
```

**Arguments:**

- `<bdjobs_url>` - URL of a BDJobs job details page (e.g., `https://bdjobs.com/jobs/details/1436685`)

**Options:**

- `--out <dir>` - Output directory (default: `jobs/`)
- `--skip` - Skip if job already exists (don't overwrite)
- `--template <pattern>` - Filename template (default: `{title}_{company}_{job_id}.md`)
- `--dry-run` - Preview output paths without writing files

**Examples:**

Basic save:

```bash
jobsnap save "https://bdjobs.com/jobs/details/1436685"
```

Save to custom directory:

```bash
jobsnap save "https://bdjobs.com/jobs/details/1436685" --out ./my-jobs
```

Skip if already exists:

```bash
jobsnap save "https://bdjobs.com/jobs/details/1436685" --skip
```

Custom filename template:

```bash
jobsnap save "https://bdjobs.com/jobs/details/1436685" --template "{title}_{company}_{job_id}.md"
```

Preview without writing:

```bash
jobsnap save "https://bdjobs.com/jobs/details/1436685" --dry-run
```

**What it does:**

1. Fetches the HTML from the BDJobs URL
2. Extracts job data using dual-path parser (JSON + text fallback)
3. Generates three files:
   - `raw.html` - Original page snapshot
   - `job.json` - Structured data
   - `job.md` - Clean Markdown
4. Updates `index.jsonl` with job metadata

**Output:**

```
jobs/1436685/
  raw.html
  job.json
  job.md
jobs/index.jsonl
```

---

### `list`

List all saved jobs with sorting, filtering, and grouping options.

**Usage:**

```bash
jobsnap list [options]
```

**Options:**

- `--sort <field>` - Sort by: `deadline` (default), `company`, `title`, `saved`
- `--active` - Show only active jobs (deadline not passed)
- `--expired` - Show only expired jobs (deadline passed)
- `--tag <tag>` - Filter by tag (e.g., `--tag backend`)
- `--group-by <field>` - Group by: `company` or `deadline`

**Examples:**

List all jobs sorted by deadline (default):

```bash
jobsnap list
```

Show only active jobs:

```bash
jobsnap list --active
```

Sort by company alphabetically:

```bash
jobsnap list --sort company
```

Filter by tag:

```bash
jobsnap list --tag remote
```

Group by company:

```bash
jobsnap list --group-by company
```

Show expired jobs sorted by company:

```bash
jobsnap list --expired --sort company
```

**What it does:**

1. Reads `jobs/index.jsonl`
2. Parses and validates all job entries
3. Applies filters (active/expired/tag)
4. Sorts by specified field
5. Groups if requested
6. Displays formatted output with color-coded deadlines

**Output format:**

```
┌─────────┬──────────────────────┬────────────────┬─────────────┐
│ Job ID  │ Title                │ Company        │ Deadline    │
├─────────┼──────────────────────┼────────────────┼─────────────┤
│ 1445561 │ Graphic Designer     │ Eden Study     │ 23d left    │
│ 1436685 │ Senior Engineer      │ ABC Tech       │ 15d left    │
└─────────┴──────────────────────┴────────────────┴─────────────┘
```

**Deadline color coding:**

- 🔴 Red: Expired
- 🟡 Yellow: 3 days or less
- 🟢 Green: 4-7 days
- ⚪ Gray: More than 7 days

---

### `export`

Export a saved job to PDF or HTML format.

**Usage:**

```bash
jobsnap export <job_dir> [options]
```

**Arguments:**

- `<job_dir>` - Path to job directory (e.g., `jobs/1436685`)

**Options:**

- `--format <type>` - Export format: `pdf` (default) or `html`

**Examples:**

Export to PDF (default):

```bash
jobsnap export jobs/1436685
```

Export to HTML:

```bash
jobsnap export jobs/1436685 --format html
```

**What it does:**

1. Reads `job.json` and `job.md` from the specified directory
2. Generates styled HTML with professional layout
3. For PDF: Uses Puppeteer (headless Chrome) to render vector PDF
4. For HTML: Saves standalone HTML file
5. Updates `index.jsonl` with `has_pdf: true` metadata

**Output:**

```
jobs/1436685/
  raw.html
  job.json
  job.md
  job.pdf          ← New PDF file (~200KB)
  # or
  job.html         ← New HTML file
```

**PDF Features:**

- Vector-based (crisp quality, small file size ~200KB)
- Professional styling with metadata header
- Consistent branding and layout
- Print-optimized margins and page breaks
- Unambiguous date format (Jan 08, 2026)

**Requirements:**

- Puppeteer is automatically installed with JobSnap
- No additional setup needed

---

### `reparse`

Re-parse an existing `raw.html` snapshot without re-downloading.

**Usage:**

```bash
jobsnap reparse <job_dir|raw_html> [options]
```

**Arguments:**

- `<job_dir>` - Path to job directory (e.g., `jobs/1436685`)
- `<raw_html>` - Path to `raw.html` file (e.g., `jobs/1436685/raw.html`)

**Options:**

- `--template <pattern>` - Filename template (default: `{title}_{company}_{job_id}.md`)
- `--dry-run` - Preview output paths without writing files

**Examples:**

Reparse from job directory:

```bash
jobsnap reparse jobs/1436685
```

Reparse from raw.html path:

```bash
jobsnap reparse jobs/1436685/raw.html
```

Preview without writing:

```bash
jobsnap reparse jobs/1436685 --dry-run
```

Custom filename template:

```bash
jobsnap reparse jobs/1436685 --template "{title}_{company}.md"
```

**What it does:**

1. Reads the existing `raw.html` file
2. Re-parses with the current parser version
3. Regenerates `job.json` and `job.md`
4. Updates `index.jsonl`

**Use cases:**

- Parser improvements in new versions
- Change filename template
- Fix corrupted JSON/Markdown files

---

### `--help`

Show usage information and examples.

**Usage:**

```bash
jobsnap --help
# or
jobsnap -h
```

---

## Options Reference

| Option                 | Type    | Default       | Description                   |
| ---------------------- | ------- | ------------- | ----------------------------- |
| `--out <dir>`          | string  | `jobs/`       | Output root directory         |
| `--skip`               | boolean | `false`       | Skip if job already exists    |
| `--template <pattern>` | string  | `{title}_{company}_{job_id}.md` | Filename template pattern |
| `--dry-run`            | boolean | `false`       | Preview paths without writing |
| `--help`, `-h`         | boolean | -             | Show help message             |

### Filename Template Patterns

Use these placeholders in `--template`:

| Placeholder | Description              | Example                    |
| ----------- | ------------------------ | -------------------------- |
| `{job_id}`  | BDJobs job ID            | `1436685`                  |
| `{title}`   | Job title (sanitized)    | `Senior_Software_Engineer` |
| `{company}` | Company name (sanitized) | `ABC_Technologies_Ltd`     |

**Template examples:**

- `{job_id}.md` → `1436685.md`
- `{title}_{job_id}.md` → `Senior_Software_Engineer_1436685.md`
- `{company}_{title}.md` → `ABC_Technologies_Ltd_Senior_Software_Engineer.md`
- `{title}_{company}_{job_id}.md` → `Senior_Software_Engineer_ABC_Technologies_Ltd_1436685.md`

---

## Configuration Files

### jobsnap.config.json

Set default values for CLI options.

**Location:** Project root (same directory where you run `jobsnap`)

**Example:**

```json
{
  "outputDir": "jobs",
  "skip": false,
  "template": "{title}_{company}_{job_id}.md",
  "dryRun": false
}
```

**Available keys:**

- `outputDir` - Default output directory
- `skip` - Default skip behavior
- `template` - Default filename template
- `dryRun` - Default dry-run mode

**Minimal example:**

```json
{
  "outputDir": "my-jobs"
}
```

### .env File

Alternative way to set output directory only.

**Location:** Project root

**Example:**

```
OUTPUT_DIR=jobs
```

### Configuration Precedence

CLI flags override config files:

```
CLI flags > jobsnap.config.json > .env > built-in defaults
```

**Example:**

```bash
# .env has: OUTPUT_DIR=jobs
# jobsnap.config.json has: "outputDir": "my-jobs"
# This command uses ./archive:
jobsnap save "..." --out ./archive
```

---

## Error Codes

JobSnap uses standard exit codes:

| Code | Meaning           | Common Causes                              |
| ---- | ----------------- | ------------------------------------------ |
| `0`  | Success           | Command completed successfully             |
| `2`  | Invalid arguments | Missing required arguments, unknown flags  |
| `3`  | Invalid config    | Malformed `jobsnap.config.json`            |
| `4`  | Fetch failed      | Network error, invalid URL, 404/403        |
| `5`  | Parse failed      | Invalid HTML, unsupported page format      |
| `6`  | Write failed      | Permission denied, disk full, invalid path |

**Example error handling in scripts:**

```bash
jobsnap save "https://bdjobs.com/jobs/details/1436685"
if [ $? -eq 4 ]; then
  echo "Fetch failed. Check your network or URL."
  exit 1
fi
```

---

## Advanced Usage

### Batch Processing

Save multiple jobs:

```bash
for job_id in 1436685 1436686 1436687; do
  jobsnap save "https://bdjobs.com/jobs/details/$job_id" --skip
done
```

Read from file:

```bash
cat job_urls.txt | while read url; do
  jobsnap save "$url" --skip
done
```

### Reparse All Jobs

Update all saved jobs with a new parser version:

```bash
for dir in jobs/*/; do
  jobsnap reparse "$dir"
done
```

### Conditional Saves

Only save if not already exists:

```bash
jobsnap save "https://bdjobs.com/jobs/details/1436685" --skip
```

### Preview Before Saving

Check output paths first:

```bash
jobsnap save "https://bdjobs.com/jobs/details/1436685" --dry-run
# Review output, then:
jobsnap save "https://bdjobs.com/jobs/details/1436685"
```

### Custom Directory Structure

Organize by company:

```bash
jobsnap save "https://bdjobs.com/jobs/details/1436685" --out "./jobs/ABC_Company"
```

By date:

```bash
TODAY=$(date +%Y-%m-%d)
jobsnap save "https://bdjobs.com/jobs/details/1436685" --out "./jobs/$TODAY"
```

---

## Output Structure

### Default Output

```
jobs/
  1436685/
    raw.html      # Original HTML snapshot
    job.json      # Structured JSON data
    job.md        # Clean Markdown file
  1436686/
    raw.html
    job.json
    job.md
  index.jsonl     # JSONL catalog (one job per line)
```

### With Custom Template

Using `--template "{title}_{company}_{job_id}.md"`:

```
jobs/
  1436685/
    raw.html
    job.json
    Senior_Software_Engineer_ABC_Technologies_Ltd_1436685.md
  index.jsonl
```

### index.jsonl Format

JSONL (JSON Lines) format - one JSON object per line:

```jsonl
{"job_id":"1436685","title":"Senior Software Engineer","company":"ABC Technologies Ltd.","saved_at":"2024-12-25T10:30:00Z","url":"https://bdjobs.com/jobs/details/1436685"}
{"job_id":"1436686","title":"Junior Developer","company":"XYZ Corp.","saved_at":"2024-12-25T11:00:00Z","url":"https://bdjobs.com/jobs/details/1436686"}
```

**Searching index.jsonl:**

```bash
# Find all jobs from ABC Technologies
grep "ABC Technologies" jobs/index.jsonl

# Count total saved jobs
wc -l jobs/index.jsonl

# Extract job IDs
jq -r '.job_id' jobs/index.jsonl
```

---

## Troubleshooting

### "Command not found: jobsnap"

**Cause:** Not globally installed.

**Solution:**

```bash
npm install -g .
```

Or use alternative invocation:

```bash
npm run jobsnap -- save "https://bdjobs.com/jobs/details/1436685"
```

### "Fetch failed (exit code 4)"

**Cause:** Network error, invalid URL, or page not found.

**Solution:**

- Check internet connection
- Verify URL is a valid BDJobs job details page
- Check if page returns 404 or 403

### "Parse failed (exit code 5)"

**Cause:** HTML format not recognized or unsupported page type.

**Solution:**

- Ensure URL is `https://bdjobs.com/jobs/details/<job_id>` format
- Page may have changed format (check for parser updates)
- File an issue with the URL for investigation

### "Write failed (exit code 6)"

**Cause:** Permission denied or disk full.

**Solution:**

- Check directory permissions
- Verify disk space
- Ensure output path is valid

### "Invalid config (exit code 3)"

**Cause:** Malformed `jobsnap.config.json`.

**Solution:**

- Validate JSON syntax
- Check for trailing commas
- Remove the config file to use defaults

---

## Examples by Use Case

### Daily Job Search Workflow

```bash
# Save today's applied jobs
jobsnap save "https://bdjobs.com/jobs/details/1436685"
jobsnap save "https://bdjobs.com/jobs/details/1436686"
jobsnap save "https://bdjobs.com/jobs/details/1436687"

# Review saved JDs
ls jobs/
cat jobs/1436685/job.md
```

### Organize by Application Date

```bash
# Create dated folder
TODAY=$(date +%Y-%m-%d)
mkdir -p jobs/$TODAY

# Save to dated folder
jobsnap save "https://bdjobs.com/jobs/details/1436685" --out "jobs/$TODAY"
```

### Update Old Jobs with New Parser

```bash
# Check current parser version
grep "parser_version" jobs/1436685/job.json

# Reparse all jobs
for dir in jobs/*/; do
  if [ -f "$dir/raw.html" ]; then
    jobsnap reparse "$dir"
  fi
done
```

### Search Across Saved Jobs

```bash
# Find jobs mentioning "React"
grep -r "React" jobs/*/job.md

# Find jobs from specific company
grep "ABC Technologies" jobs/index.jsonl

# List all job titles
jq -r '.title' jobs/index.jsonl
```

---

## See Also

- [README.md](../README.md) - Project overview and quick start
- [Output Contract](../README.md#output-contract) - Guaranteed output format
- [Extension Guide](../README.md#extension-guide) - Chrome extension usage
- [FAQ](../README.md#faq) - Frequently asked questions
