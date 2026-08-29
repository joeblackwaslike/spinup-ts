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
- `--non-interactive` / `--yes` / `-y` — scaffold with defaults only, no prompts
- `--version` / `-v`, `--help` / `-h`

## Key Files

- `src/index.ts` — CLI entry: arg parsing, `new`/`update` subcommands, `--non-interactive`
- `src/prompts.ts` — interactive prompts + `buildDefaultConfig` (non-interactive); reads `~/.spinup-tsrc.json` for defaults
- `src/scaffold.ts` — degit + post-scaffold setup; template source is `joeblackwaslike/spinup-ts/template`. `SPINUP_TS_SKIP_INSTALL=1` skips the generated project's dependency install (used by the CI pack smoke test)
- `src/update.ts` — `update` mode for retrofitting existing repos
- `src/types.ts` — Zod schemas: `ProjectConfig`, `UserDefaults`
- `template/` — the scaffolded project template

## Local Dev

Run `npm link` after any folder move to keep the global `spinup-ts` symlink current.

## User Defaults

Persist prompt defaults to `~/.spinup-tsrc.json`. Schema: `UserDefaults` in `src/types.ts`.

## Release

`release-please` (`release-type: node`) opens a release PR from `main`; merging it publishes to npm with provenance. Versioning starts at 0.1.0.
