# spinup-ts

TypeScript project scaffolding CLI — the TypeScript sibling of [`spinup-py`](https://github.com/joeblackwaslike/spinup-py). The two CLIs share one schema (`spinup-ts` ⇄ `spinup-py`): keep them symmetric.

## Commands

|Command|Purpose|
|---|---|
|`pnpm build`|Compile TypeScript → `dist/`|
|`pnpm dev`|Watch mode|
|`pnpm test`|Vitest|
|`pnpm test:coverage`|Coverage report|
|`pnpm lint`|Biome + ESLint|
|`pnpm typecheck`|`tsc --noEmit`|
|`pnpm check`|lint + typecheck together|

## CLI Schema (must mirror spinup-py)

- `spinup-ts [new] <name>` — scaffold (interactive)
- `spinup-ts update [dir]` / `spinup-ts --update [dir]` — retrofit an existing repo
- `--non-interactive` / `--yes` / `-y` — scaffold with defaults only, no prompts; with `update`, apply every available update (including the pnpm + Bun toolchain migration)
- `--version` / `-v`, `--help` / `-h`

## Key Files

- `src/index.ts` — CLI entry: arg parsing, `new`/`update` subcommands, `--non-interactive`
- `src/prompts.ts` — interactive prompts + `buildDefaultConfig` (non-interactive); reads `~/.spinup-tsrc.json` for defaults
- `src/scaffold.ts` — degit + post-scaffold setup; template source is `joeblackwaslike/spinup-ts/template`. `SPINUP_TS_SKIP_INSTALL=1` skips the generated project's dependency install (used by the CI pack smoke test)
- `src/update.ts` — `update` mode for retrofitting existing repos
- `src/migrate.ts` — toolchain migration (npm/yarn -> pnpm, npx/tsx -> bunx/bun, removes old lockfiles and `node_modules`); used by `update`
- `src/workflows.ts` — GitHub Actions rewrites used by the migration (pnpm/Bun setup steps, Node floor, cache, pinned pnpm version)
- `src/types.ts` — Zod schemas: `ProjectConfig`, `UserDefaults`
- `template/` — the scaffolded project template

## Local Dev

Run `pnpm link --global` after any folder move to keep the global `spinup-ts` symlink current.

## Toolchain

pnpm manages dependencies; Bun is the runtime for dev scripts (`bun`, `bunx`; never `npm`, `npx`, `yarn` or `tsx`). Run every command from the repo root. The published CLI still runs on Node (`engines.node`) because it ships to npm; the Node matrix in CI stays.

## User Defaults

Persist prompt defaults to `~/.spinup-tsrc.json`. Schema: `UserDefaults` in `src/types.ts`.

## Release

`release-please` (`release-type: node`) opens a release PR from `main`; merging it publishes to npm with provenance. Versioning starts at 0.1.0.
