---
name: update
description: Retrofit an existing TypeScript project with current spinup-ts tooling, devcontainer, documentation, and agent infrastructure. Analyzes the target repo and applies only what is missing or outdated.
argument-hint: "[project-path]"
allowed-tools:
  - Bash
  - Read
  - Write
  - Skill
---

# update — Retrofit Existing TypeScript Project

Apply the full spinup-ts upgrade suite to an existing repo: modern tooling configs, image-based devcontainer, Docusaurus docs, README overhaul, and agent infrastructure. Every phase is independent; the user can skip any.

## Step 1 — Resolve Target

If a `project-path` argument was provided:

```bash
TARGET=$(realpath "<project-path>")
echo "$TARGET"
```

Otherwise use the current working directory:

```bash
TARGET=$(pwd)
echo "$TARGET"
```

Confirm:

> Updating project at: `<TARGET>` — proceed?

## Step 2 — Discovery

Read these files and check presence/state (run reads in parallel where possible):

| Check | Path |
|---|---|
| Package manifest | `package.json` |
| TypeScript config | `tsconfig.json` |
| Biome | `biome.json` or `biome.jsonc` |
| ESLint | `eslint.config.*` or `.eslintrc.*` |
| Husky | `.husky/` directory |
| CI workflows | `.github/workflows/` — list files |
| Devcontainer | `.devcontainer/devcontainer.json` |
| Docs | `docs/` — check if Docusaurus or raw markdown |
| README | `README.md` — rough content quality |
| Agent infra | `CLAUDE.md`, `AGENTS.md`, `.beads/`, `.serena/project.yml` |

Determine the state of each. For the devcontainer specifically:
- **MISSING** — no `.devcontainer/devcontainer.json`
- **LOCAL_BUILD** — `devcontainer.json` has `"build": { "dockerfile": ... }`
- **IMAGE_BASED** — `devcontainer.json` has `"image": ...`

## Step 3 — Show Plan and Confirm

Show a table:

| Phase | Scope | Status |
|---|---|---|
| 0 — Toolchain | pnpm + Bun migration (lockfiles, scripts, CI, docs, node_modules) | legacy / up-to-date |
| A — Tooling | Biome, ESLint strict, tsconfig, Husky, CI | missing / outdated / up-to-date |
| B — Devcontainer | Migrate local-build → image, or add fresh | <state from discovery> |
| C — Docs | Docusaurus setup / migration / generation | absent / raw markdown / partial / up-to-date |
| D — README | Overhaul with rich badges and structured sections | sparse / present |
| E — Agent infra | CLAUDE.md, Beads, Serena | missing / partial / up-to-date |

Ask:

> Run all phases? (yes / select phases to skip)

If a phase appears up-to-date, confirm before re-running it.

---

## Phase 0 — Toolchain (pnpm + Bun)

Run this first. It is the one-command path for bringing an older spinup-ts project (or any npm/yarn project) onto the current standard: **pnpm** for dependencies, **Bun** as the runtime (`bun`, `bunx`), every command run from the repo root.

```bash
bunx spinup-ts update "$TARGET" --yes
```

`--yes` applies every available update without prompting, which is the right mode for agents and scripts. To run only this phase interactively, run `bunx spinup-ts update "$TARGET"` and select **Migrate to pnpm + Bun**.

What the migration does:

- Sets `packageManager` to the installed pnpm; creates `pnpm-workspace.yaml` from `workspaces` / `onlyBuiltDependencies` (`allowBuilds`) and drops those fields from `package.json`
- Rewrites `npx` -> `bunx`, `npm run`/`yarn` -> `pnpm`, `npm ci` -> `pnpm install --frozen-lockfile`, `tsx` -> `bun` in `package.json` scripts, `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `justfile`, `.husky/*` and `.github/**`; removes the `tsx` devDependency
- Pins Bun in `.bun-version` and adds `oven-sh/setup-bun@v2` before the pnpm setup step in CI workflows
- Deletes `package-lock.json`, `npm-shrinkwrap.json`, `yarn.lock`, `.yarn/`, `.pnp.*`, `bun.lock*`, `.pnpm-store` and `node_modules`, then runs `pnpm install` to generate `pnpm-lock.yaml`

Report any "review" warnings (README, Dockerfile, docs still mentioning npm/npx/yarn) to the user; those are not rewritten automatically because published install instructions for consumers may legitimately mention npm.

---

## Phase A — Tooling

Load the `spinup-ts:spinup-ts` skill for the canonical config content.

### Biome

If `biome.json` is absent or uses a schema older than 1.9: write the standard `biome.json` from the skill's `references/frameworks.md`. Required settings:

- `"$schema": "https://biomejs.dev/schemas/1.9.4/schema.json"`
- `formatter.indentWidth: 2`, `formatter.lineWidth: 100`
- `linter.rules.recommended: true`
- VCS integration: `vcs.enabled: true`, `vcs.clientKind: "git"`

### ESLint Strict

If `eslint.config.ts` or `eslint.config.mjs` is absent: write the full flat-config from `references/frameworks.md`. Required rules:

- TypeScript strict type-checked (`@typescript-eslint/recommended-type-checked`)
- `max-lines-per-function: 80`
- `max-statements: 20`
- `unicorn/import-style` — `node:` protocol must use default import

If a legacy `.eslintrc.*` exists: migrate to flat config then delete the legacy file.

### tsconfig.json

Ensure these strict flags are set; add any that are missing without touching existing config:

- `"strict": true`
- `"noUncheckedIndexedAccess": true`
- `"exactOptionalPropertyTypes": true`
- `"noImplicitOverride": true`
- `"verbatimModuleSyntax": true`

### Husky + lint-staged

If `.husky/` is absent:

```bash
cd "$TARGET" && bunx husky init
```

Write `.husky/pre-commit`:

```sh
pnpm lint-staged
```

If `lint-staged` is not in `package.json`, add to the `package.json` root:

```json
"lint-staged": {
  "*.{ts,tsx,js,jsx}": ["biome check --write", "eslint --fix"],
  "*.{json,md,yaml,yml}": ["biome format --write"]
}
```

### CI Workflows

Check `.github/workflows/`. Add any missing workflows (full content in `references/frameworks.md`):

- `ci.yml` — typecheck + lint + test on push/PR
- `release.yml` — release-please automation
- `publish.yml` — npm publish on release tag (only if `publishToNpm` is detected as true in package.json or existing workflow)

Do not overwrite existing workflows unless they are clearly outdated (e.g., using an old Node version action).

---

## Phase B — Devcontainer

The canonical devcontainer config is maintained at `/Users/joe/github/joeblackwaslike/devcontainer/.devcontainer/devcontainer.json`. Read that file for the exact mounts, extensions, and remoteEnv to use.

The fast path is `bunx spinup-ts update "$TARGET" --yes`, which rewrites `.devcontainer/devcontainer.json` from the template bundled with spinup-ts (the image config from the devcontainer repo's `src/claude-code` template: pnpm + Bun image, bun cache and pnpm store mounts, `NPM_TOKEN` passthrough, `initializeCommand`). It only does so when the file is missing or lacks those markers; review the result with `git diff`. Use the manual steps below when the project's devcontainer has customizations that must be kept.

### Detect State

```bash
if [ -f "$TARGET/.devcontainer/devcontainer.json" ]; then
  grep -q '"build"' "$TARGET/.devcontainer/devcontainer.json" && echo "LOCAL_BUILD" || echo "IMAGE_BASED"
else
  echo "MISSING"
fi
```

### Case: MISSING

Write `.devcontainer/devcontainer.json` using the canonical config as the base. Replace `"name": "dev-claude"` with the actual package name from `package.json`.

### Case: LOCAL_BUILD

Migrate the existing file:

1. Remove the `"build": { ... }` key entirely.
2. Add `"image": "ghcr.io/joeblackwaslike/devcontainer:latest"` at the top level.
3. Remove `"ghcr.io/devcontainers/features/node:1"` from `features` (Node is baked into the image).
4. Update `"postCreateCommand"` → `"/usr/local/share/devcontainer/scripts/setup.sh"`
5. Update `"postAttachCommand"` → `"/usr/local/share/devcontainer/scripts/discover-deps.sh"`
6. Update the Codex CLI mount source: `~/.codex` → `~/.cpdex` (target stays `/home/vscode/.codex`).
7. Add `readonly` to both opencode mounts if missing: `.config/opencode` and `.local/share/opencode`.
8. Delete these local files (they are now baked into the image):
   - `.devcontainer/Dockerfile`
   - `.devcontainer/Aptfile`
   - `.devcontainer/.mytheme.omp.yaml`
   - `.devcontainer/scripts/setup.sh`
   - `.devcontainer/scripts/discover-deps.sh`

Do not delete `scripts/init-project.sh` — it is still useful for reinitializing the devcontainer from the central repo.

### Case: IMAGE_BASED

Compare mounts and remoteEnv against the canonical config. Patch any entries that are missing or use outdated source paths (e.g., `.codex` instead of `.cpdex`).

---

## Phase C — Documentation

```
Invoke the agent-skills:docusaurus-docs-builder skill.
```

Provide this context:

- Target project path: `<TARGET>`
- Current docs state from discovery: absent / raw markdown / partial Docusaurus
- Goal: complete Docusaurus 3 site with at minimum: Getting Started, API reference, Architecture, Contributing

Also request:

- `docusaurus-plugin-llms` installed and configured for `llms.txt` / `llms-full.txt` generation (AI agent consumption)
- An architecture overview in the Architecture section, generated by invoking `agent-skills:interactive-system-docs` if the codebase is non-trivial

If Docusaurus is already set up: check for missing sections, generate stubs for any that are absent, and verify `docusaurus-plugin-llms` is installed.

---

## Phase D — README

```
Invoke the agent-skills:github-readme-overhaul skill.
```

Provide this context:

- Project path: `<TARGET>`
- Package metadata: name, description, author (from `package.json`)
- Whether Docusaurus was set up in Phase C (link to `/docs` instead of inlining full API reference)

Expected output: rich badge row (CI, coverage, npm version, license), hero section, features list, quick start (≤ 5 commands), configuration reference, contributing section.

---

## Phase E — Agent Infrastructure

### CLAUDE.md

If absent or < 20 meaningful lines:

Read `package.json` for the project name, scripts, and description. Write a project-specific `CLAUDE.md`:

```markdown
# <project-name>

<one-line description from package.json>

## Commands

| Command | Purpose |
|---|---|
| `<pm> build` | Compile TypeScript → `dist/` |
| `<pm> dev` | Watch mode |
| `<pm> test` | Run tests |
| `<pm> lint` | Biome + ESLint |
| `<pm> typecheck` | `tsc --noEmit` |

## Key Files

- `src/index.ts` — public entry point
<add any other obviously key files visible from the codebase>
```

If `AGENTS.md` is absent: write a single line:

```
@CLAUDE.md
```

### Beads

If `.beads/` is absent:

```bash
cd "$TARGET" && bd init --skip-agents --non-interactive
```

### Serena

If `.serena/project.yml` is absent:

```bash
PKG_NAME=$(node -e "const p=require('$TARGET/package.json');console.log(p.name)")
mkdir -p "$TARGET/.serena"
cat > "$TARGET/.serena/project.yml" <<EOF
project_name: "$PKG_NAME"
EOF
```

---

## Phase F — Commit

Stage and commit all changes:

```bash
cd "$TARGET"
git add -A
git commit -m "chore: apply spinup-ts updates"
```

Report a one-line summary per phase: what was added, migrated, or skipped.
