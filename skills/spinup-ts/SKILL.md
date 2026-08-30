---
name: spinup-ts
description: >-
  This skill should be used when scaffolding a new TypeScript project, creating
  a TypeScript library, CLI, server, or MCP server from scratch, bootstrapping
  a new repo with production-ready tooling, using the spinup-ts tool,
  updating an existing TypeScript repo to add Biome, ESLint strict, Vitest,
  Husky, GitHub Actions, Docusaurus, or devcontainer tooling, or when the user
  says "scaffold a TypeScript project", "bootstrap a new repo", "create a new
  library", "set up a TypeScript CLI/server/MCP server", "add GitHub Actions",
  or "update my repo with the template tooling".
---

# spinup-ts

Scaffold and maintain production-ready TypeScript projects — the TypeScript sibling of [`spinup-py`](https://github.com/joeblackwaslike/spinup-py).

## What It Provides

Every scaffolded project gets an opinionated, pre-integrated stack:

| Layer | Tool |
|---|---|
| Package manager | pnpm (default), bun, or npm |
| Formatter + linter | Biome + ESLint strict (unicorn, sonarjs, import-x) |
| Type checker | tsc `--noEmit` with `strictTypeChecked` |
| Test runner | Vitest + `@vitest/coverage-v8` |
| Pre-commit | Husky + lint-staged |
| CI | GitHub Actions (test matrix, CodeQL, release-please, dependabot, stale) |
| Docs | Docusaurus 3 + TypeDoc + llms.txt plugin |
| Dev environment | devcontainer (VS Code Dev Containers compatible) |
| Containerization | Dockerfile + docker-compose (optional) |
| Task runner | justfile |
| Release | release-please |

## Setup

### Install from Source (local dev)

```bash
git clone https://github.com/joeblackwaslike/spinup-ts
cd spinup-ts
pnpm install && pnpm build
npm link   # makes `spinup-ts` available globally
```

After any folder move, re-run `npm link` — the symlink stores the absolute path.

### Run via Package Manager (no install)

```bash
pnpm dlx spinup-ts my-project
npx spinup-ts my-project
```

## Creating a New Project

### Interactive Mode (Human)

```bash
spinup-ts my-project
```

The CLI walks through prompts in sequence:

1. **Project name** — pre-filled from the positional argument
2. **Description** — free text; used in package.json and README
3. **Author name** — your full name
4. **Author email**
5. **GitHub handle** — used to build repo URLs, badge links
6. **Node version** — 20 | 22 (LTS ✓) | 23
7. **Package manager** — pnpm (recommended) | bun | npm
8. **Project type** — library | cli | server | mcp-server
9. **Include GitHub Actions?** — yes/no
10. **Publish to npm?** — yes/no
11. **Include Docusaurus docs?** — yes/no
12. **Include Codecov?** — yes/no
13. **Include Dockerfile?** — yes/no
14. **Include devcontainer?** — yes/no
15. **License** — MIT | Apache-2.0 | ISC | GPL-3.0 | BSD-3-Clause

All prompts except name and description can be pre-filled via the user defaults file.

### Agent Mode (non-interactive — preferred)

The interactive prompts use `@clack/prompts`, which requires a TTY and does not accept
piped stdin. For agent workflows, use `--non-interactive` (alias `--yes` / `-y`) — it
scaffolds with defaults only, no prompts, no PTY:

```bash
spinup-ts my-project --non-interactive
```

Defaults resolve in order: `~/.spinup-tsrc.json` → local `git config` (author name/email)
→ built-in fallbacks. Write the RC file first to control the non-default fields:

```json
{
  "author": "Joe Black",
  "email": "joeblackwaslike@gmail.com",
  "githubHandle": "joeblackwaslike",
  "nodeVersion": "22",
  "packageManager": "pnpm",
  "projectType": "library",
  "includeGithubActions": true,
  "publishToNpm": false,
  "includeDocs": false,
  "includeCodecov": false,
  "includeDockerfile": false,
  "includeDevcontainer": true,
  "license": "MIT"
}
```

### Agent Mode (interactive fallback — TTY)

If you need to override fields per-run, write the RC file and run the CLI in a real TTY:

**Step 1 — Write user defaults.**

Create or update `~/.spinup-tsrc.json` with all known values before running the CLI:

```json
{
  "author": "Joe Black",
  "email": "joeblackwaslike@gmail.com",
  "githubHandle": "joeblackwaslike",
  "nodeVersion": "22",
  "packageManager": "pnpm",
  "projectType": "library",
  "includeGithubActions": true,
  "publishToNpm": false,
  "includeDocs": false,
  "includeCodecov": false,
  "includeDockerfile": false,
  "includeDevcontainer": true,
  "license": "MIT"
}
```

With defaults set, only `description` still requires manual input during the run.

**Step 2 — Run via PTY wrapper** (in a shell that has a TTY):

```bash
spinup-ts my-project
```

The CLI will present prompts with the RC values pre-filled. Accept each with `Enter`, or type a custom value. For full automation, use a PTY tool like `expect` or `script`.

**Step 3 — Post-scaffold setup (automated):**

```bash
cd my-project
git init && git add -A && git commit -m "chore: initial scaffold"
gh repo create joeblackwaslike/my-project --public --source=. --remote=origin --push
npm link   # if this is a CLI or tool being developed
```

## Updating an Existing Project

Add tooling to a repo that was not scaffolded with `spinup-ts`:

```bash
spinup-ts --update .
# or
spinup-ts --update /path/to/repo
```

A multiselect menu shows only the options the target repo is missing:

| Option | What it adds |
|---|---|
| Add Biome config | Copies `biome.json` from template |
| Tighten `tsconfig.json` | Adds `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` |
| Add ESLint strict config | Copies `eslint.config.mjs` (unicorn + sonarjs + import-x) |
| Add Husky + lint-staged | Pre-commit hook wiring |
| Add GitHub Actions CI | Copies `ci.yml` workflow |
| Configure VS Code Biome formatter | Merges `.vscode/settings.json` |
| Initialize Beads task manager | Runs `bd init --skip-agents` |
| Initialize Serena | Creates `.serena/project.yml` |

Each option is gated: if the target file/directory already exists, the option is hidden.

## User Defaults File

Path: `~/.spinup-tsrc.json`

All fields are optional. Any field set here pre-fills the corresponding prompt. The schema is `ProjectConfig` minus `projectName`, `projectSlug`, and `description` — all fields partial.

See `references/agent-workflow.md` for a full schema reference and agent patterns.

## Template Contents

After scaffolding, the project includes:

```
my-project/
├── src/
├── tests/
├── docs/              # Docusaurus site (if enabled)
├── .github/workflows/ # CI, CodeQL, release-please (if enabled)
├── .devcontainer/     # Dev container config (if enabled)
├── biome.json
├── eslint.config.mjs
├── tsconfig.json
├── vitest.config.ts
├── justfile
├── CLAUDE.md          # Claude Code project instructions
├── AGENTS.md          # Agent instructions (imports CLAUDE.md)
└── package.json
```

## Framework References

For deep guidance on any included framework, consult `references/frameworks.md`. Quick pointers:

| Framework | Skill to invoke |
|---|---|
| Docusaurus docs site | `agent-skills:docusaurus-docs-builder` |
| GitHub README | `agent-skills:github-readme-overhaul` |
| Interactive architecture docs | `agent-skills:interactive-system-docs` |
| Stack architecture decisions | `personal-agent-skills:joe-stack-preferences` |
| Agent workflow design | `agent-skills:best-practices-for-agentic-development` |

## Agent Behavior Rules

Follow `agent-skills:best-practices-for-agentic-development` universal practices when using this tool:

- **State the goal first.** Know the project type, name, description, and target GitHub handle before starting.
- **Write the RC file before invoking the CLI.** Never run the CLI without pre-filled defaults.
- **Prefer `--update` for existing repos.** Do not re-scaffold if the repo already has source files.
- **Verify before claiming complete.** Confirm `package.json`, `tsconfig.json`, and the CI workflow (if included) exist after scaffolding.
- **Use a real TTY.** The tool does not support piped stdin; spawn it in a terminal session, not a captured subprocess.

## Additional Resources

### Reference Files

- **`references/frameworks.md`** — Quick reference for every included framework: Biome, ESLint, Vitest, Husky, GitHub Actions, Docusaurus, devcontainer, justfile, release-please, and llms.txt
- **`references/agent-workflow.md`** — Full RC schema, PTY patterns, post-scaffold automation, and common agent task sequences

### Related Skills

| Goal | Skill |
|---|---|
| Build or improve the Docusaurus docs site in a scaffolded project | `agent-skills:docusaurus-docs-builder` |
| Overhaul the README in a scaffolded project | `agent-skills:github-readme-overhaul` |
| Build an interactive architecture visualization | `agent-skills:interactive-system-docs` |
| Verify stack/library choices against Joe's preferences | `personal-agent-skills:joe-stack-preferences` |
| Design agentic workflows that consume this tool | `agent-skills:best-practices-for-agentic-development` |

## Red Flags

Stop and re-evaluate if:

- Running `spinup-ts` without writing `~/.spinup-tsrc.json` first — all defaults will be wrong.
- Using `--update` on a fresh directory — use the scaffold flow instead.
- Piping stdin to bypass prompts — `@clack/prompts` requires a real TTY; use `expect` or run interactively.
- Adding dependencies not in the template without checking `joe-stack-preferences` first.
- Scaffolding a project and immediately starting feature work — always commit the scaffold output first.
