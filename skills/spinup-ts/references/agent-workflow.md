# Agent Workflow Reference

Detailed guidance for AI agents using `spinup-ts` programmatically.

---

## Constraint: TTY Required

`spinup-ts` uses `@clack/prompts`, which renders interactive UI elements that require a real TTY. Piping stdin does not work:

```bash
echo "my-description" | spinup-ts my-app  # ❌ does not work
```

Agents must either:
1. **Run interactively in a terminal** — the agent handles the session through a PTY (e.g., VS Code integrated terminal, tmux pane)
2. **Use `expect` for full automation** (advanced)
3. **Pre-fill all defaults** via the RC file and then accept prompts with Enter

The RC file approach (option 3) is the recommended pattern.

---

## Full RC Schema

`~/.spinup-tsrc.json` — all fields optional, all map to scaffold prompt defaults:

```typescript
{
  // Identity (pre-fills author/email/handle prompts)
  author?: string;
  email?: string;
  githubHandle?: string;

  // Node + package manager
  nodeVersion?: "20" | "22" | "23";        // default: "22"
  packageManager?: "pnpm" | "bun" | "npm"; // legacy; always resolves to "pnpm"

  // Project shape
  projectType?: "library" | "cli" | "server" | "mcp-server"; // default: "library"

  // Optional features
  includeGithubActions?: boolean;  // default: true
  publishToNpm?: boolean;          // default: false
  includeDocs?: boolean;           // default: false
  includeCodecov?: boolean;        // default: false
  includeDockerfile?: boolean;     // default: false
  includeDevcontainer?: boolean;   // default: true

  // License
  license?: "MIT" | "Apache-2.0" | "ISC" | "GPL-3.0" | "BSD-3-Clause"; // default: "MIT"
}
```

**Fields NOT in RC file (always required at prompt time):**
- `projectName` — pass as positional CLI argument instead
- `projectSlug` — derived automatically from `projectName`
- `description` — must be entered at the prompt

---

## Standard Agent Task Sequences

### Task: Scaffold a new TypeScript library

```bash
# 1. Write RC defaults
cat > ~/.spinup-tsrc.json << 'EOF'
{
  "author": "Joe Black",
  "email": "joeblackwaslike@gmail.com",
  "githubHandle": "joeblackwaslike",
  "nodeVersion": "22",
  "packageManager": "pnpm",
  "projectType": "library",
  "includeGithubActions": true,
  "publishToNpm": true,
  "includeDocs": true,
  "includeCodecov": false,
  "includeDockerfile": false,
  "includeDevcontainer": true,
  "license": "MIT"
}
EOF

# 2. Run CLI (in a TTY session)
spinup-ts my-library
# Prompts that need manual input: description

# 3. Post-scaffold
cd my-library
git init && git add -A
git commit -m "chore: initial scaffold from spinup-ts"
gh repo create joeblackwaslike/my-library --public --source=. --remote=origin --push
```

### Task: Scaffold a TypeScript CLI tool

```bash
# Update RC for CLI type
jq '.projectType = "cli" | .publishToNpm = true' ~/.spinup-tsrc.json > /tmp/rc.json \
  && mv /tmp/rc.json ~/.spinup-tsrc.json

spinup-ts my-cli
```

### Task: Scaffold an MCP server

```bash
jq '.projectType = "mcp-server" | .publishToNpm = false | .includeDocs = false' \
  ~/.spinup-tsrc.json > /tmp/rc.json \
  && mv /tmp/rc.json ~/.spinup-tsrc.json

spinup-ts my-mcp-server
```

### Task: Retrofit an existing repo

```bash
# Run update mode — shows only options missing from the target repo
spinup-ts --update /path/to/existing-repo

# Or from inside the repo:
cd /path/to/existing-repo
spinup-ts --update .
```

The update menu only shows options where the target config file/directory is absent. Safe to run on any repo.

---

## Post-Scaffold Checklist

After scaffolding, verify the project is complete before starting feature work:

```bash
ls package.json tsconfig.json biome.json eslint.config.mjs vitest.config.ts
# → all should exist

pnpm install
pnpm build
pnpm check        # lint + typecheck must pass on a fresh scaffold
pnpm test         # tests must pass
```

Then commit and push:

```bash
git init
git add -A
git commit -m "chore: initial scaffold from spinup-ts"
gh repo create <org>/<name> --public --source=. --remote=origin --push
```

---

## expect Script (Full Automation)

For fully headless automation, use `expect` to drive the prompts:

```bash
#!/usr/bin/expect -f
# Usage: ./scaffold.exp my-project "A brief description"

set project_name [lindex $argv 0]
set description  [lindex $argv 1]

spawn spinup-ts $project_name

# Project name — pre-filled from arg, just Enter
expect "Project name"
send "\r"

# Description — must type it
expect "Description"
send "$description\r"

# All remaining prompts are pre-filled from RC file — just Enter each
expect "Author name"  { send "\r" }
expect "Author email" { send "\r" }
expect "GitHub handle" { send "\r" }
expect "Node version"  { send "\r" }
expect "Package manager" { send "\r" }
expect "Project type"  { send "\r" }
expect "Include GitHub Actions" { send "\r" }
expect "Publish to npm" { send "\r" }
expect "Include Docusaurus docs" { send "\r" }
expect "Include Codecov" { send "\r" }
expect "Include Dockerfile" { send "\r" }
expect "Include devcontainer" { send "\r" }
expect "License" { send "\r" }

expect eof
```

---

## When to Use `--update` vs. Re-scaffold

| Situation | Action |
|---|---|
| Empty directory, starting fresh | `spinup-ts <name>` |
| Existing repo missing Biome, ESLint, CI, etc. | `spinup-ts --update .` |
| Existing repo with source code, need only CI | `spinup-ts --update .` → select only CI |
| Repo already has all tooling | Neither — nothing to do |

Never re-scaffold a repo that has existing source code. The scaffold writes to the destination directory, potentially overwriting files.

---

## Docusaurus Docs (if `includeDocs: true`)

After scaffolding with docs enabled, the `docs/` directory contains a full Docusaurus 3 site. For any docs work:

```
Invoke skill: agent-skills:docusaurus-docs-builder
```

Key commands:
```bash
pnpm --filter docs start   # dev server
pnpm --filter docs build   # production build
```

The docs site is in a pnpm workspace at `docs/`. The root `pnpm-workspace.yaml` declares it.

---

## Common Pitfalls

| Pitfall | Fix |
|---|---|
| Running without an RC file | Write `~/.spinup-tsrc.json` first |
| Scaffolding into a non-empty directory | The CLI will warn — confirm intentional overwrite |
| Forgetting `pnpm install` after scaffold | Always run `pnpm install` before building/testing |
| `pnpm link --global` pointing to old path | Re-run `pnpm link --global` from the project root after any folder move |
| ESLint `max-lines-per-function` errors | Extract helper functions; the 80-line limit is enforced in pre-commit |
| Docusaurus build fails on first run | Run `pnpm --filter docs build` from project root; check TypeDoc source paths |
