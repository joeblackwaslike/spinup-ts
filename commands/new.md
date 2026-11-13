---
name: new
description: Scaffold a new TypeScript project through guided conversation. Collects all configuration interactively, then drives the scaffold engine directly via Node.js — no TTY or interactive CLI prompts needed. Initializes git and optionally creates a GitHub repo.
argument-hint: "[project-name]"
allowed-tools:
  - Bash
  - Read
  - Write
---

# new — Guided TypeScript Project Scaffold

Scaffold a new TypeScript project by collecting configuration through chat, then calling the scaffold engine directly. This bypasses the interactive CLI entirely — no TTY, no expect scripts.

## Step 0 — Ensure the CLI

If `command -v spinup-ts` finds nothing, tell the user you are about to install it globally with `npm i -g spinup-ts` before running the block below.

```bash
command -v spinup-ts >/dev/null || npm i -g spinup-ts
command -v spinup-ts
```

If the second line prints nothing, stop and show the install error to the user. If the error is `EACCES` (a root-owned global npm prefix), tell them to point npm at a user-writable prefix (`npm config set prefix ~/.npm-global`, then add `~/.npm-global/bin` to `PATH`) and re-run.

## Step 1 — Collect Configuration

**Project name:** Use the argument if provided. If not, ask:

> What's the project name? (kebab-case, e.g. `my-lib`)

**Description:** Always ask — this is not in the RC file:

> One-sentence description of the project?

**Defaults:** Read `~/.spinup-tsrc.json` if it exists. Use those values as defaults for all remaining fields. Show a one-line summary:

> Using RC defaults: pnpm · library · Node 22 · GitHub Actions on · devcontainer on · MIT. Change anything?

If the user wants to change anything, ask which fields. Otherwise proceed.

For any field missing from the RC file, use these fallbacks:

| Field | Fallback |
| --- | --- |
| `nodeVersion` | `"22"` |
| `packageManager` | `"pnpm"` |
| `projectType` | `"library"` |
| `includeGithubActions` | `true` |
| `publishToNpm` | `false` |
| `includeDocs` | `false` |
| `includeCodecov` | `false` |
| `includeDockerfile` | `false` |
| `includeDevcontainer` | `true` |
| `license` | `"MIT"` |

**Required fields with no fallback** — if these are absent from the RC file, ask for them:

- `author` — full name
- `email` — email address
- `githubHandle` — GitHub username

## Step 2 — Confirm

Show the full config as a compact table and ask the user to confirm before proceeding.

## Step 3 — Scaffold

**Find the scaffold module:**

```bash
CLI_BIN=$(which spinup-ts 2>/dev/null)
CLI_REAL=$(python3 -c "import os; print(os.path.realpath('$CLI_BIN'))" 2>/dev/null)
PKG_ROOT=$(dirname "$(dirname "$CLI_REAL")")
echo "$PKG_ROOT"
```

**Write and run a temp scaffold script** at `/tmp/spinup-ts-scaffold.mjs`, substituting all gathered values:

```js
import { scaffold, checkDestinationDir } from '<PKG_ROOT>/dist/scaffold.js';

const destDir = '<ABSOLUTE_DEST_DIR>';
const config = {
  projectName: '<name>',
  projectSlug: '<name with hyphens replaced by underscores>',
  description: '<description>',
  author: '<author>',
  email: '<email>',
  githubHandle: '<githubHandle>',
  nodeVersion: '<nodeVersion>',
  packageManager: '<packageManager>',
  projectType: '<projectType>',
  includeGithubActions: <true|false>,
  publishToNpm: <true|false>,
  includeDocs: <true|false>,
  includeCodecov: <true|false>,
  includeDockerfile: <true|false>,
  includeDevcontainer: <true|false>,
  license: '<license>',
};

await checkDestinationDir(destDir);
await scaffold(destDir, config);
console.log('Scaffold complete.');
```

Run it:

```bash
node /tmp/spinup-ts-scaffold.mjs && rm /tmp/spinup-ts-scaffold.mjs
```

If the scaffold fails, report the error clearly and stop. Do not proceed to post-scaffold steps.

## Step 4 — Post-Scaffold Setup

Run these in sequence, reporting each step:

```bash
cd <project-name>
<packageManager> install
git init && git add -A && git commit -m "chore: initial scaffold from spinup-ts"
```

Then ask:

> Push to GitHub? (public / private / skip)

If push is requested:

```bash
gh repo create <githubHandle>/<project-name> --<public|private> --source=. --remote=origin --push
```

## Step 5 — Summary

Report:

- Full path to the new project
- GitHub URL (if pushed)
- Suggested next steps: `cd <project-name>` · `<pm> dev` · `<pm> test`
