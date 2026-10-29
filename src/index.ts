#!/usr/bin/env node
import { createRequire } from 'node:module';
import path from 'node:path';
import * as clack from '@clack/prompts';
// eslint-disable-next-line import-x/no-unresolved
import { buildDefaultConfig, runPrompts } from './prompts.js';
// eslint-disable-next-line import-x/no-unresolved
import { checkDestinationDir, scaffold } from './scaffold.js';
import type { ProjectConfig } from './types.js';
// eslint-disable-next-line import-x/no-unresolved
import { updateProject } from './update.js';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { version: string };

const HELP_TEXT = `spinup-ts — scaffold a production-ready TypeScript project (sibling of spinup-py)

Usage:
  spinup-ts [new] <project-name>     Scaffold a new TypeScript project
  spinup-ts update [dir]             Retrofit an existing repo with template tooling
  spinup-ts --update [dir]           Alias for \`update\`

Options:
  -y, --yes, --non-interactive       Scaffold with defaults only, no prompts (needs <project-name>);
                                     with update, apply every available update without prompting
      --only=<ids>                   With update, restrict to a comma-separated set of updates
                                     (toolchain,devcontainer,biome,tsconfig,eslint,husky,ci,vscode,beads,serena)
  -v, --version                      Print version
  -h, --help                         Show this help

Examples:
  spinup-ts my-lib
  spinup-ts new my-lib
  spinup-ts my-lib --non-interactive
  spinup-ts update .
  spinup-ts --update /path/to/repo
`;

interface ParsedArgs {
  command: 'new' | 'update';
  name?: string | undefined;
  dir?: string | undefined;
  nonInteractive: boolean;
  only?: string[] | undefined;
  help: boolean;
  version: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const help = argv.includes('--help') || argv.includes('-h');
  const version = argv.includes('--version') || argv.includes('-v');
  const nonInteractive =
    argv.includes('--non-interactive') || argv.includes('--yes') || argv.includes('-y');
  const updateFlag = argv.includes('--update') || argv.includes('-u');
  const onlyArgument = argv.find((a) => a.startsWith('--only='));
  const only = onlyArgument
    ?.slice('--only='.length)
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  const positionals = argv.filter((a) => !a.startsWith('-'));

  // Subcommand form: `new <name>` / `update [dir]`
  if (positionals[0] === 'new') {
    return { command: 'new', name: positionals[1], nonInteractive, help, version };
  }
  if (positionals[0] === 'update') {
    return { command: 'update', dir: positionals[1], nonInteractive, only, help, version };
  }

  // Flag form: `--update [dir]`
  if (updateFlag) {
    return { command: 'update', dir: positionals[0], nonInteractive, only, help, version };
  }

  // Bare form: `spinup-ts <name>`
  return { command: 'new', name: positionals[0], nonInteractive, help, version };
}

async function runCreate(projectName: string | undefined, nonInteractive: boolean): Promise<void> {
  const destDir = path.resolve(projectName ?? '.');
  await checkDestinationDir(destDir);

  let config: ProjectConfig;
  if (nonInteractive) {
    if (!projectName) {
      throw new Error('A project name is required in non-interactive mode: spinup-ts <name> --yes');
    }
    config = await buildDefaultConfig(projectName);
  } else {
    config = await runPrompts(projectName);
  }

  await scaffold(destDir, config);
  clack.outro(`Project created at ${destDir}`);
}

async function runUpdate(
  targetDir: string,
  nonInteractive: boolean,
  only?: string[],
): Promise<void> {
  await updateProject(path.resolve(targetDir), { nonInteractive, only });
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    process.stdout.write(HELP_TEXT);
    return;
  }

  if (args.version) {
    process.stdout.write(`${packageJson.version}\n`);
    return;
  }

  if (args.command === 'update') {
    await runUpdate(args.dir ?? '.', args.nonInteractive, args.only);
    return;
  }

  await runCreate(args.name, args.nonInteractive);
}

await main().catch((error: unknown) => {
  if (error instanceof Error) {
    clack.log.error(error.message);
  } else {
    clack.log.error(String(error));
  }
  process.exit(1);
});
