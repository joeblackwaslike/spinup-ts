# spinup-ts

[![CI](https://github.com/joeblackwaslike/spinup-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/joeblackwaslike/spinup-ts/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/spinup-ts?color=3fb950&label=npm)](https://www.npmjs.com/package/spinup-ts)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Discord](https://img.shields.io/discord/1486035859747897414?logo=discord&label=Discord&color=5865F2)](https://discord.gg/Fjc9zYHZyV)

> Start a TypeScript project that already passes review.

Scaffold a production-ready TypeScript project with opinionated tooling — the TypeScript sibling of [spinup-py](https://github.com/joeblackwaslike/spinup-py).

`spinup-ts` ⇄ `spinup-py` share the same CLI schema, so remembering one gives you the other.

## Usage

```bash
# New project (interactive)
npx spinup-ts my-project
# or: pnpm dlx spinup-ts my-project
# or: bunx spinup-ts my-project

# New project (defaults only, no prompts)
npx spinup-ts my-project --non-interactive

# Retrofit an existing repo with template tooling
npx spinup-ts update .
```

Install globally if you scaffold often:

```bash
npm i -g spinup-ts
spinup-ts my-project
```

## CLI

```text
spinup-ts [new] <project-name>     Scaffold a new TypeScript project
spinup-ts update [dir]             Retrofit an existing repo with template tooling
spinup-ts --update [dir]           Alias for `update`

  -y, --yes, --non-interactive     Scaffold with defaults only, no prompts (needs <project-name>)
  -v, --version                    Print version
  -h, --help                       Show this help
```

Non-interactive defaults resolve from `~/.spinup-tsrc.json`, then local `git config`
(author name/email), then built-in fallbacks.

## What's Included

| Python ([spinup-py](https://github.com/joeblackwaslike/spinup-py)) | TypeScript equivalent |
|---|---|
| `uv` | `pnpm` |
| `ruff` | `Biome` |
| `wemake-python-styleguide` | ESLint strict (unicorn + sonarjs + import-x) |
| `mypy --strict` | `tsc --noEmit` + `@typescript-eslint/strictTypeChecked` |
| `pytest` + `coverage` | `Vitest` + `@vitest/coverage-v8` |
| `mkdocs-material` | `Docusaurus` |
| `deptry` | `depcheck` |
| `pre-commit` | `Husky` + `lint-staged` + `commitlint` |
| `Makefile` | `justfile` |
| `tox` (multi-version) | CI matrix over Node 20/22 |
| `release-please` | `release-please` (`release-type: node`) |

## Prompt Options

- **Project name** — kebab-case slug
- **Description** — one-liner
- **Author / Email / GitHub handle**
- **Node version** — 20, 22, 23 (written to `.tool-versions` for mise/asdf)
- **Package manager** — pnpm (default), bun, npm
- **Project type** — library, cli, server, mcp-server
- **GitHub Actions** — CI + release workflows
- **Publish to npm** — with provenance
- **Docusaurus docs** — deployed to GitHub Pages on release
- **Codecov** — coverage reporting
- **Dockerfile** — multi-stage Node build
- **Devcontainer** — full Claude Code-optimized environment
- **License** — MIT, Apache 2.0, BSD, ISC, GPL-3, None

## Development

```bash
pnpm install
pnpm build
pnpm test
```
