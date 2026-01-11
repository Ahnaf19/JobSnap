<div align="center">
  <img src="extension/img/icon-128.png" width="96" alt="JobSnap" />
  <h1>JobSnap</h1>
  <p><strong>Save BDJobs circulars before they disappear.</strong></p>
  <p>
    <a href="https://github.com/Ahnaf19/jobsnap/releases"><img src="https://img.shields.io/badge/version-v2.0.0-ff6a3d" alt="Version" /></a>
    <a href="#requirements"><img src="https://img.shields.io/badge/node-18%2B-3c873a?logo=node.js&logoColor=white" alt="Node.js" /></a>
    <img src="https://img.shields.io/badge/javascript-ES2022-f7df1e?logo=javascript&logoColor=000" alt="JavaScript" />
    <img src="https://img.shields.io/badge/Chrome-MV3-4285f4?logo=googlechrome&logoColor=white" alt="Chrome" />
    <a href="#license"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" /></a>
  </p>
  <p>
    <a href="#installation">Installation</a> •
    <a href="#quick-start">Quick Start</a> •
    <a href="#documentation">Documentation</a> •
    <a href="#features">Features</a> •
    <a href="#roadmap">Roadmap</a>
  </p>
</div>

---

[BDJobs.com](https://bdjobs.com/) hides job descriptions after the deadline. Want to review that JD before your interview? **You need a Pro subscription.**

`JobSnap` fixes this:

- 💻 **CLI:** `jobsnap save <url>`, `jobsnap list`, `jobsnap export`
- 🌐 **Extension:** One-click download (Markdown or PDF)

<!-- TODO: Update demo GIF to show v2.0 features (list, export commands) -->
![JobSnap demo](assets/jobsnap-demo.gif)

## What JobSnap Does

```bash
jobsnap save "https://bdjobs.com/jobs/details/1234567"
```

**Instantly creates:**

- `job.md` - Clean Markdown (LLM-friendly)
- `job.json` - Structured data (programmatic access)
- `raw.html` - Original page (future-proof re-parsing)

<div align="center">
  <sub>Made with ❤️ for job seekers fighting paywalls</sub>
</div>

---

## Installation

### Global Install (Recommended)

```bash
git clone https://github.com/Ahnaf19/jobsnap.git
cd jobsnap
npm install
npm install -g .
```

Now use `jobsnap` anywhere:

```bash
jobsnap save "https://bdjobs.com/jobs/details/1436685"
```

### Alternative Methods

<details>
<summary><b>Run from Repo (No Global Install)</b></summary>

```bash
npm install
npm run jobsnap -- save "https://bdjobs.com/jobs/details/1436685"
```

</details>

<details>
<summary><b>Chrome Extension (One-Click Saves)</b></summary>

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `extension/` folder
4. Click JobSnap icon on any BDJobs job page or paste the URL
</details>

---

## Quick Start

### Save Your First Job

```bash
jobsnap save "https://bdjobs.com/jobs/details/1436685"
```

**Output structure:**

```
jobs/1436685/
  ├── raw.html       # Original snapshot
  ├── job.json       # Structured data
  └── job.md         # Clean Markdown
jobs/index.jsonl     # Searchable catalog
```

### Re-parse Old Jobs

```bash
jobsnap reparse jobs/1436685
```

Use this when:

- Parser improves in a new version
- You want a different filename template
- Job files get corrupted

### Batch Save Multiple Jobs

```bash
jobsnap save "https://bdjobs.com/jobs/details/1436685" --skip
jobsnap save "https://bdjobs.com/jobs/details/1436686" --skip
jobsnap save "https://bdjobs.com/jobs/details/1436687" --skip
```

> [!TIP]
> The `--skip` flag prevents overwriting jobs you've already saved.

---

## Features

| Feature                 | Description                                                         |
| ----------------------- | ------------------------------------------------------------------- |
| 🔒 **Offline-First**    | Your data stays on your disk. No cloud dependencies.                |
| 🤖 **AI-Ready**         | Clean Markdown works seamlessly with ChatGPT, Claude, etc.          |
| 📋 **List & Filter**    | View, sort, and filter saved jobs by deadline, company, or tags.    |
| 📄 **PDF Export**       | Export jobs to professional PDFs or HTML with one command.          |
| 🔄 **Future-Proof**     | Re-parse old snapshots if BDJobs changes their format.              |
| ⚡ **Dual-Path Parser** | Extracts embedded JSON + text fallback for resilience.              |
| 🎯 **Smart Dates**      | Unambiguous date format (Jan 08, 2026) prevents confusion.          |
| 🎨 **Flexible Output**  | Customize filenames with templates: `{title}_{company}_{job_id}.md` |
| 🧪 **Tested**           | Unit tests, schema validation, fixture regression suite.            |
| 🌐 **Two Interfaces**   | CLI for power users, Chrome extension for one-click saves.          |

---

## Documentation

### 📚 Guides

- **[CLI Reference](docs/cli-reference.md)** - Complete command documentation
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to JobSnap
- **[Release Notes v1.0](https://github.com/Ahnaf19/jobsnap/releases/tag/v1.0.0)** - What's new in v1.0

### 📖 Sections

- [Output Contract](#output-contract) - Guaranteed schema stability
- [How It Works](#how-it-works) - Dual-path parsing explained
- [Configuration](#configuration) - Config files and precedence
- [Extension Guide](#extension-guide) - Chrome extension usage
- [Roadmap](#roadmap) - Future plans (v2.0, v3.0)
- [FAQ](#faq) - Common questions

---

## CLI Commands

| Command                    | Description                                    |
| -------------------------- | ---------------------------------------------- |
| `jobsnap save <url>`       | Fetch and save a BDJobs circular               |
| `jobsnap list`             | List all saved jobs with filtering/sorting     |
| `jobsnap export <job_dir>` | Export job to PDF or HTML                      |
| `jobsnap reparse <dir>`    | Re-parse from existing `raw.html`              |
| `jobsnap --help`           | Show usage information                         |

### Common Options

| Option                 | Description                   | Example                                      |
| ---------------------- | ----------------------------- | -------------------------------------------- |
| `--out <dir>`          | Custom output directory       | `--out ./my-jobs`                            |
| `--skip`               | Skip if job already exists    | `--skip`                                     |
| `--template <pattern>` | Filename template             | `--template "{title}_{company}_{job_id}.md"` |
| `--dry-run`            | Preview paths without writing | `--dry-run`                                  |

**See full documentation:** [docs/cli-reference.md](docs/cli-reference.md)

---

## Output Contract

JobSnap v1.0 guarantees a **stable output format**. Changes require a major version bump.

### job.json Schema

**Required fields:**

```json
{
  "job_id": "1436685",
  "url": "https://bdjobs.com/jobs/details/1436685",
  "saved_at": "2024-12-25T10:30:00Z",
  "source": "bdjobs",
  "parser_version": "1.0.0",
  "title": "Senior Software Engineer",
  "company": "ABC Technologies Ltd.",
  "summary": "...",
  "requirements": { ... },
  "responsibilities_context": { ... },
  "company_information": "..."
}
```

**Optional fields:** `application_deadline`, `published`, `skills_expertise`, `compensation_other_benefits`, `read_before_apply`

### job.md Headings

Headings appear in this order when present:

1. **Summary**
2. **Requirements** (Education / Experience / Skills)
3. **Responsibilities & Context**
4. **Skills & Expertise**
5. **Compensation & Other Benefits**
6. **Read Before Apply**
7. **Company Information**
8. **Raw Text** (fallback only)

---

## How It Works

### Dual-Path Parsing

JobSnap uses **two complementary extraction methods** to ensure reliability:

1. **Primary:** Extract embedded JSON from BDJobs' Angular state (`ng-state`)
2. **Fallback:** Text scraping with intelligent section detection
3. **Merge:** Combine both results for maximum data coverage

Even if BDJobs changes their page structure, JobSnap adapts.

### Reparse Workflow

```bash
# Save with current parser
jobsnap save "https://bdjobs.com/jobs/details/1436685"

# Later: parser improves in v1.1
jobsnap reparse jobs/1436685  # No re-download needed!
```

Since JobSnap saves `raw.html`, you can regenerate `job.json` and `job.md` with newer parser versions anytime.

---

## Configuration

### Config File (`jobsnap.config.json`)

Set defaults in your project root:

```json
{
  "outputDir": "jobs",
  "template": "{title}_{company}_{job_id}.md",
  "skip": false
}
```

### Precedence Rules

```
CLI flags > jobsnap.config.json > .env > defaults
```

**Example:**

```bash
# Config has: outputDir = "jobs"
# This command uses "./archive" instead:
jobsnap save "..." --out ./archive
```

**Full configuration guide:** [docs/cli-reference.md](docs/cli-reference.md#configuration-files)

---

## Extension Guide

The Chrome extension uses the **same parser** as the CLI.

### Usage

1. Open a BDJobs job page
2. Click the JobSnap icon
3. Choose:
   - **Download from current tab** (one click)
   - **Download from URL** (paste a link)

### Customization

- **Filename parts:** Check/uncheck Title, Company, Job ID
- **Defaults:** Right-click icon → Options

### Syncing Core Updates

If you modify `core/` files:

```bash
npm run sync-extension
```

Then reload the extension in Chrome.

---

## Use Cases

| Scenario                      | Solution                                                      |
| ----------------------------- | ------------------------------------------------------------- |
| **Preparing for interviews?** | Review all saved JDs in one folder. Grep for specific skills. |
| **Tailoring your CV?**        | Extract common requirements from saved jobs.                  |
| **Lost access to a JD?**      | Re-read anytime—no Pro subscription needed.                   |
| **AI-powered analysis?**      | Feed Markdown to ChatGPT/Claude for career advice.            |
| **Tracking applications?**    | Search `index.jsonl` for all jobs from a company.             |

---

## Testing

```bash
npm test
```

**Test coverage:**

- ✅ Unit tests (core parser logic)
- ✅ Schema validation (required fields)
- ✅ Markdown contract (stable headings)
- ✅ Fixture regression (real BDJobs pages)

---

## Roadmap

### v1.0 ✅

- Stable output contract
- Dual-path parser with fallback
- CLI + Chrome extension
- Regression test suite

### v2.0 (Current) ✅

- 📋 **List command** - View, sort, and filter saved jobs
- 📄 **PDF/HTML export** - Export jobs to PDF or HTML with professional styling
- 🎨 **Enhanced extension** - PDF download with native Chrome support
- 📅 **Date standardization** - Unambiguous date format (MMM DD, YYYY)

### v3.0 (Planned)

- 🤖 **LLM-powered JD summaries** - Extract must-haves vs nice-to-haves
- 📊 **CV gap analysis** - Compare resume against saved JDs
- 📝 **Interview prep** - Auto-generate topic checklists
- 🏷️ **Tagging system** - Tag and categorize saved jobs

### v4.0+ (Future)

- 🌍 **Multi-platform** - LinkedIn, Glassdoor, etc.
- 🇧🇩 **Bangla support** - Local job board compatibility
- 🔍 **Advanced search** - Full-text search across all saved jobs

---

## FAQ

<details>
<summary><b>Does this violate BDJobs terms of service?</b></summary>

JobSnap saves publicly accessible pages for personal archival use, similar to saving a webpage in your browser. It doesn't automate interactions, bypass authentication, or scrape private data. Use responsibly.

</details>

<details>
<summary><b>What if BDJobs changes their page format?</b></summary>

JobSnap's dual-path parser adapts automatically. You can also re-parse old jobs with `jobsnap reparse` using updated parsers.

</details>

<details>
<summary><b>Can I use this for other job boards?</b></summary>

Not yet. v1.0 only supports BDJobs. Multi-platform support is planned for v3.0+. Contributions are welcomed!

</details>

<details>
<summary><b>Where is my data stored?</b></summary>

Locally on your disk in the `jobs/` folder (or custom `--out` directory). JobSnap doesn't send data to external servers.

</details>

<details>
<summary><b>How do I update JobSnap?</b></summary>

```bash
git pull
npm install -g .
```

Then optionally reparse old jobs: `jobsnap reparse jobs/<job_id>`

</details>

---

## Known Limitations

- ⚠️ Only supports `https://bdjobs.com/jobs/details/<job_id>` format
- ⚠️ No "Applied jobs" automation (manual URL input required)
- ⚠️ English only (Bangla support planned for v3.0+)

---

## Requirements

- **Node.js 18+** (tested with Node 22)
- **Chrome browser** (for extension)

---

## Contributing

Contributions are welcome! 🎉

- 🐛 **Report bugs** - Open an issue with reproduction steps
- 💡 **Request features** - Describe your use case
- 🔧 **Submit PRs** - See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines
- 📦 **Add fixtures** - Help test with real BDJobs pages

Please read our [Contributing Guide](CONTRIBUTING.md) before submitting pull requests.

---

## License

[MIT](LICENSE) - See LICENSE file for details

---

## Acknowledgments

Built to solve a real problem faced during my December 2023 job search in Bangladesh.

**Questions or feedback?** [Open an issue](../../issues) or reach out!

---

<div align="center">
  <sub>Made with ❤️ for job seekers fighting paywalls</sub>
</div>
