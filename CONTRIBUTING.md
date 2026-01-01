# Contributing to JobSnap

First off, thank you for considering contributing to JobSnap! It's people like you who make JobSnap better for job seekers everywhere.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Submitting Pull Requests](#submitting-pull-requests)
- [Development Setup](#development-setup)
- [Testing](#testing)
- [Code Style](#code-style)
- [Project Structure](#project-structure)
- [License](#license)

---

## Code of Conduct

This project welcomes contributions from everyone. By participating, you are expected to:

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

---

## How Can I Contribute?

### Reporting Bugs

**Before submitting a bug report:**
- Check the [existing issues](../../issues) to avoid duplicates
- Verify you're using the latest version (`git pull` and reinstall)
- Test with a minimal configuration (no custom `jobsnap.config.json`)

**When submitting a bug report, include:**
- **Clear title** - Describe the issue in one line
- **Steps to reproduce** - Numbered list of exact steps
- **Expected behavior** - What you thought would happen
- **Actual behavior** - What actually happened
- **Environment**:
  - JobSnap version (from `package.json` or release tag)
  - Node.js version (`node --version`)
  - Operating system and version
  - BDJobs job URL (if applicable and public)
- **Logs/Screenshots** - Error messages, terminal output, or screenshots

**Example:**
```markdown
**Title:** Parse fails for jobs with missing company information

**Steps to reproduce:**
1. Run `jobsnap save "https://bdjobs.com/jobs/details/1234567"`
2. Check `job.json`

**Expected:** Should handle missing company gracefully
**Actual:** Crashes with "Cannot read property 'name' of undefined"

**Environment:**
- JobSnap: v1.0.0
- Node: v22.0.0
- OS: macOS 14.5

**Error log:**
```
[paste error output]
```
```

### Suggesting Features

**Before suggesting a feature:**
- Check [existing issues](../../issues) and the [roadmap](README.md#roadmap)
- Consider if it fits JobSnap's core mission (saving BDJobs circulars)

**When suggesting a feature, include:**
- **Use case** - What problem does this solve?
- **Proposed solution** - How should it work?
- **Alternatives considered** - Other approaches you thought about
- **Breaking changes** - Would this affect existing users?

**Example:**
```markdown
**Use case:** I apply to 50+ jobs per month and want to see trends in required skills.

**Proposed solution:** Add a `jobsnap stats` command that analyzes all saved jobs and outputs a skill frequency report.

**Alternatives:** Could use external tools like `jq` or write a custom script.

**Breaking changes:** None, this is a new command.
```

### Submitting Pull Requests

**PR Workflow:**

1. **Fork and clone**
   ```bash
   git clone https://github.com/your-username/jobsnap.git
   cd jobsnap
   npm install
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
   Use descriptive branch names:
   - `feature/add-linkedin-support`
   - `fix/missing-deadline-crash`
   - `docs/improve-cli-examples`

3. **Make your changes**
   - Follow the [code style](#code-style)
   - Add tests for new functionality
   - Update documentation (README, CLI reference) if needed

4. **Test your changes**
   ```bash
   npm test                          # Run all tests
   npm run jobsnap -- save <url>     # Manual smoke test
   ```

5. **Commit with clear messages**
   ```bash
   git commit -m "fix: handle missing company information gracefully"
   ```
   Use conventional commit prefixes:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `test:` - Adding or updating tests
   - `refactor:` - Code refactoring
   - `chore:` - Maintenance tasks

6. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then open a pull request on GitHub.

**PR Requirements:**
- ✅ All tests pass (`npm test`)
- ✅ Code follows project style (ES2022, functional patterns)
- ✅ Commits are clear and atomic
- ✅ Documentation updated if needed
- ✅ No unrelated changes (stay focused on one issue)

**PR Description Template:**
```markdown
## What does this PR do?
Brief description of the change.

## Why is this needed?
Explain the problem or use case.

## How was this tested?
- [ ] Unit tests added/updated
- [ ] Manual testing: `jobsnap save <url>`
- [ ] Verified on Node 18 and Node 22

## Checklist
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No breaking changes (or clearly documented)

Closes #123
```

---

## Development Setup

### Prerequisites
- Node.js 18+ (tested with Node 22)
- Git

### Setup Steps

1. **Clone and install**
   ```bash
   git clone https://github.com/your-username/jobsnap.git
   cd jobsnap
   npm install
   ```

2. **Run locally**
   ```bash
   npm run jobsnap -- save "https://bdjobs.com/jobs/details/1436685"
   ```

3. **Install globally for testing**
   ```bash
   npm install -g .
   jobsnap save "https://bdjobs.com/jobs/details/1436685"
   ```

4. **Extension development**
   ```bash
   # After changing core/ files
   npm run sync-extension

   # Then reload in chrome://extensions
   ```

---

## Testing

### Running Tests

```bash
npm test              # Run all test suites
node --test           # Alternative (same as npm test)
```

### Test Suites

1. **Unit tests** (`tests/*.test.js`)
   - Core parser logic
   - Rendering functions
   - Utility functions

2. **Schema validation** (`tests/schema.test.js`)
   - Required fields present
   - Data types correct

3. **Markdown contract** (`tests/markdown_contract.test.js`)
   - Stable heading structure

4. **Fixture regression** (if `docs/fixtures/bdjobs/manifest.jsonl` exists)
   - Real BDJobs pages parse correctly

### Adding Tests

**For new features:**
```javascript
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { yourNewFunction } from '../core/yourModule.js'

test('yourNewFunction handles edge case', () => {
  const result = yourNewFunction(edgeCaseInput)
  assert.equal(result, expected)
})
```

**For bug fixes:**
1. Add a test that reproduces the bug
2. Verify the test fails
3. Fix the bug
4. Verify the test passes

---

## Code Style

### JavaScript Conventions

- **ES2022 modules** - Use `import`/`export`, not `require()`
- **Functional approach** - Prefer pure functions in `core/`
- **Async/await** - Use for file I/O and HTTP (no callbacks)
- **No semicolons** - Project uses ASI (Automatic Semicolon Insertion)

### Naming

- **snake_case** - JSON keys (`job_id`, `raw_text`)
- **camelCase** - JavaScript variables, functions
- **PascalCase** - Classes (`CliError`)

### File Organization

- **Small, focused modules** - Keep functions single-purpose
- **Pure core/** - No side effects in parsing logic
- **Clear exports** - Export only what's needed

### Example

```javascript
// Good
export function extractJobId(url) {
  const match = url.match(/\/(\d+)$/)
  return match ? match[1] : null
}

// Avoid
export function doEverything(url) {
  // 200 lines of mixed concerns
}
```

---

## Project Structure

```
jobsnap/
├── core/                 # Pure parsing logic (1,077 LOC)
│   ├── parseBdjobsHtml.js   # Dual-path parser
│   ├── renderJobMd.js       # Markdown generation
│   ├── schema.js            # Output contract
│   └── ...
├── cli/                  # CLI wrapper (569 LOC)
│   ├── jobsnap.js           # Entry point
│   ├── run.js               # Command routing
│   ├── save.js              # Save workflow
│   └── ...
├── extension/            # Chrome MV3 extension
│   ├── core/                # Synced from core/
│   ├── popup.html
│   └── manifest.json
├── tests/                # Test suite
│   ├── parser.test.js
│   ├── schema.test.js
│   └── ...
├── docs/                 # Documentation
│   └── cli-reference.md
└── README.md
```

### Key Principles

1. **Shared core** - CLI and extension use identical parsing logic
2. **Overwrite-by-default** - Unless `--skip` flag is used
3. **Stable output** - v1.0 contract guarantees consistent format
4. **Future-proof** - `raw.html` enables re-parsing

---

## Adding Support for New Job Boards

**Note:** Multi-platform support is planned for v3.0+. If you want to add support for LinkedIn, Glassdoor, etc.:

1. Open an issue first to discuss the approach
2. Consider creating a separate parser module (e.g., `core/parseLinkedin.js`)
3. Ensure output conforms to the same schema (`job.json` contract)
4. Add fixtures and tests for the new platform

---

## Documentation

When changing functionality:

1. **README.md** - Update if user-facing behavior changes
2. **docs/cli-reference.md** - Update if CLI commands/options change
3. **Code comments** - Add comments for non-obvious logic only
4. **Release notes** - Maintainers will handle this

---

## Security Issues

**Do not open public issues for security vulnerabilities.**

Instead, email the maintainer directly (see README for contact info) with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We'll respond within 48 hours and work with you on a fix before public disclosure.

---

## License

By contributing to JobSnap, you agree that your contributions will be licensed under the [MIT License](LICENSE).

You retain copyright to your contributions, but grant JobSnap a perpetual, worldwide, non-exclusive, royalty-free license to use, modify, and distribute your contributions as part of the project.

---

## Questions?

- **General questions:** Open a [discussion](../../discussions) or issue
- **Stuck on setup:** Check the [FAQ](README.md#faq) or open an issue
- **Want to help but don't know where to start:** Look for issues labeled `good first issue` or `help wanted`

---

Thank you for contributing to JobSnap! 🎉

Every bug report, feature suggestion, and pull request helps make job searching less painful for everyone.
