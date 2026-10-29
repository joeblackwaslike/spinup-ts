# __PROJECT_NAME__

__DESCRIPTION__

## Stack

- **Language:** TypeScript (ESM). **pnpm** manages dependencies and the workspace; **Bun** is the runtime for scripts and the dev loop
- **Tooling:** Biome + ESLint (lint/format), Vitest (tests), `tsc` (build), Docusaurus (docs)
- **Runtime:** Bun (pinned in `.bun-version`); published output stays Node >= __NODE_VERSION__ compatible

## Commands

```sh
pnpm dev             # watch-run src/index.ts (bun --watch)
pnpm build           # compile TypeScript -> dist/
pnpm test            # run tests (vitest)
pnpm test:coverage   # tests with coverage
pnpm lint            # Biome + ESLint
pnpm lint:fix        # autofix lint issues
pnpm format          # Biome formatter
pnpm typecheck       # tsc --noEmit
pnpm check           # typecheck + lint
```

## Conventions

- Tests live in `tests/`, mirroring `src/` structure
- Use `pnpm`, `bun` and `bunx` only -- never `npm`, `npx`, `yarn` or `tsx`
- Run every command from the repo root; never `cd` into a package (use `pnpm --filter <name> <script>`)
- Use `pnpm add` to add dependencies, never hand-edit the `package.json` deps
- ESM only (`"type": "module"`); target Node >= __NODE_VERSION__ (pinned in `.nvmrc` / `.tool-versions`)
- Conventional Commits enforced by commitlint — run `pnpm commit` for a guided prompt

## Agent Instruction Files

`AGENTS.md` (this file) is the source of truth — readable by Codex, Gemini, OpenCode, Cursor, and GitHub Copilot directly.
`CLAUDE.md` contains only `@AGENTS.md` so Claude Code imports this file inline.

Do **not** write `@filename` imports in AGENTS.md — that syntax is Claude Code-only and does nothing in other tools.

## Setup

Get a working dev environment — installs dependencies and wires up the git hooks (Husky `prepare`):

```sh
pnpm install
```
