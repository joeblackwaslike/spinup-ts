import { exec } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import fs from 'fs-extra';

const execAsync = promisify(exec);

const PKG = 'package.json';
const WORKSPACE_FILE = 'pnpm-workspace.yaml';
const BUN_VERSION_FILE = '.bun-version';
const DEFAULT_BUN_VERSION = '1.4.4';

const FOREIGN_LOCKFILES = [
  'package-lock.json',
  'npm-shrinkwrap.json',
  'yarn.lock',
  'bun.lockb',
  'bun.lock',
  '.pnp.cjs',
  '.pnp.loader.mjs',
  '.yarnrc',
  '.yarnrc.yml',
];
const FOREIGN_DIRS = ['.yarn', '.npm', '.pnpm-store', 'node_modules'];

const TEXT_TARGETS = ['AGENTS.md', 'CLAUDE.md', 'CONTRIBUTING.md', 'justfile', 'Justfile'];
const TEXT_TARGET_DIRS = ['.husky', '.github'];
const REVIEW_TARGETS = ['README.md', 'Dockerfile', 'docker-compose.yml', 'docs'];

const COMMAND_REWRITES: [RegExp, string][] = [
  [/\bnpx (?:-y |--yes )?tsx /g, 'bun '],
  [/\bnpx (?:-y |--yes )?/g, 'bunx '],
  [/\bnpm ci\b/g, 'pnpm install --frozen-lockfile'],
  [/\bnpm run (\S+) (?:--workspace=|--workspace |-w )(\S+)/g, 'pnpm --filter $2 $1'],
  [/\bnpm run /g, 'pnpm '],
  [/\bnpm (test|install|exec)\b(?! (?:-g|--global)\b)/g, 'pnpm $1'],
  [/\byarn run /g, 'pnpm '],
  [/\byarn (?=\S)/g, 'pnpm '],
  [/\btsx watch /g, 'bun --watch '],
  [/(^|[\s&|;(])tsx /g, '$1bun '],
];

export interface MigrationReport {
  changes: string[];
  manual: string[];
}

export interface MigrateOptions {
  install?: boolean;
}

interface PackageJson {
  packageManager?: string;
  scripts?: Record<string, string>;
  devDependencies?: Record<string, string>;
  dependencies?: Record<string, string>;
  workspaces?: string[] | { packages?: string[] };
  pnpm?: { onlyBuiltDependencies?: string[] };
  [key: string]: unknown;
}

export function rewriteCommands(text: string): string {
  let result = text;
  for (const [pattern, replacement] of COMMAND_REWRITES) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

async function pnpmVersion(): Promise<string> {
  try {
    const { stdout } = await execAsync('pnpm --version');
    return stdout.trim();
  } catch {
    return '11.28.9';
  }
}

function workspacePackages(package_: PackageJson): string[] {
  const { workspaces } = package_;
  if (Array.isArray(workspaces)) return workspaces;
  return workspaces?.packages ?? ['.'];
}

function renderWorkspaceYaml(packages: string[], builds: string[]): string {
  const lines = ['packages:', ...packages.map((p) => `  - '${p}'`)];
  if (builds.length > 0) {
    lines.push('', 'allowBuilds:', ...builds.map((b) => `  '${b}': true`));
  }
  return `${lines.join('\n')}\n`;
}

function migrateScripts(package_: PackageJson, report: MigrationReport): void {
  const scripts = package_.scripts ?? {};
  for (const [name, command] of Object.entries(scripts)) {
    const rewritten = rewriteCommands(command);
    if (rewritten === command) continue;
    scripts[name] = rewritten;
    report.changes.push(`package.json: script "${name}": ${command} -> ${rewritten}`);
  }

  const stillUsesTsx = Object.values(scripts).some((c) => /\btsx\b/.test(c));
  if (package_.devDependencies?.tsx && !stillUsesTsx) {
    Reflect.deleteProperty(package_.devDependencies, 'tsx');
    report.changes.push('package.json: removed tsx devDependency (Bun runs TypeScript directly)');
  }
}

async function migrateWorkspace(
  dir: string,
  package_: PackageJson,
  report: MigrationReport,
): Promise<void> {
  const workspaceFile = path.join(dir, WORKSPACE_FILE);
  if (await fs.pathExists(workspaceFile)) {
    if (package_.workspaces || package_.pnpm?.onlyBuiltDependencies) {
      report.manual.push(
        `${PKG}: workspaces/onlyBuiltDependencies left in place because ${WORKSPACE_FILE} already exists -- merge them by hand`,
      );
    }
    return;
  }
  const builds = package_.pnpm?.onlyBuiltDependencies ?? [];
  await fs.writeFile(
    workspaceFile,
    renderWorkspaceYaml(workspacePackages(package_), builds),
    'utf8',
  );
  report.changes.push(
    `${WORKSPACE_FILE}: created from package.json workspaces/onlyBuiltDependencies`,
  );
  if (package_.workspaces) {
    Reflect.deleteProperty(package_, 'workspaces');
    report.changes.push('package.json: removed "workspaces" (pnpm-workspace.yaml owns it)');
  }
  if (package_.pnpm?.onlyBuiltDependencies) {
    Reflect.deleteProperty(package_.pnpm, 'onlyBuiltDependencies');
    if (Object.keys(package_.pnpm).length === 0) Reflect.deleteProperty(package_, 'pnpm');
    report.changes.push(
      'package.json: moved onlyBuiltDependencies to allowBuilds in workspace file',
    );
  }
}

async function migratePackageJson(dir: string, report: MigrationReport): Promise<void> {
  const file = path.join(dir, PKG);
  const package_ = (await fs.readJson(file)) as PackageJson;

  if (!package_.packageManager?.startsWith('pnpm@')) {
    package_.packageManager = `pnpm@${await pnpmVersion()}`;
    report.changes.push(`package.json: packageManager -> ${package_.packageManager}`);
  }
  migrateScripts(package_, report);
  await migrateWorkspace(dir, package_, report);
  await fs.writeJson(file, package_, { spaces: 2 });
}

async function filesUnder(root: string): Promise<string[]> {
  if (!(await fs.pathExists(root))) return [];
  const entries = await fs.readdir(root, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name));
}

async function listTextFiles(dir: string): Promise<string[]> {
  const named = TEXT_TARGETS.map((name) => path.join(dir, name));
  const existing = await Promise.all(named.map((file) => fs.pathExists(file)));
  const nested = await Promise.all(TEXT_TARGET_DIRS.map((sub) => filesUnder(path.join(dir, sub))));
  return [...named.filter((_, index) => existing[index]), ...nested.flat()];
}

const SETUP_PNPM_STEP = /^([ \t]*)- (?:name: .*\n[ \t]*)?uses: pnpm\/action-setup/m;

export function addSetupBun(text: string): string {
  if (text.includes('oven-sh/setup-bun')) return text;
  const match = SETUP_PNPM_STEP.exec(text);
  if (!match) return text;
  const indent = match[1] ?? '';
  const step = `${indent}- uses: oven-sh/setup-bun@v2\n${indent}  with:\n${indent}    bun-version-file: ${BUN_VERSION_FILE}\n\n`;
  return text.slice(0, match.index) + step + text.slice(match.index);
}

async function migrateTextFiles(dir: string, report: MigrationReport): Promise<void> {
  for (const file of await listTextFiles(dir)) {
    const original = await fs.readFile(file, 'utf8');
    let next = rewriteCommands(original);
    if (file.includes(`${path.sep}.github${path.sep}`) && /\.ya?ml$/.test(file)) {
      next = addSetupBun(next);
    }
    if (next !== original) {
      await fs.writeFile(file, next, 'utf8');
      report.changes.push(`${path.relative(dir, file)}: commands updated to pnpm / bun / bunx`);
    }
  }
}

async function addBunVersion(dir: string, report: MigrationReport): Promise<void> {
  const target = path.join(dir, BUN_VERSION_FILE);
  if (await fs.pathExists(target)) return;
  await fs.writeFile(target, `${DEFAULT_BUN_VERSION}\n`, 'utf8');
  report.changes.push(`${BUN_VERSION_FILE}: pinned Bun ${DEFAULT_BUN_VERSION}`);
}

async function removeForeign(dir: string, report: MigrationReport): Promise<void> {
  for (const name of [...FOREIGN_LOCKFILES, ...FOREIGN_DIRS]) {
    const target = path.join(dir, name);
    if (await fs.pathExists(target)) {
      await fs.remove(target);
      report.changes.push(`removed ${name}`);
    }
  }
}

async function reviewCandidates(target: string): Promise<string[]> {
  if (!(await fs.pathExists(target))) return [];
  const stat = await fs.stat(target);
  if (!stat.isDirectory()) return [target];
  const files = await filesUnder(target);
  return files.filter((file) => /\.(md|mdx|ya?ml|json)$/.test(file));
}

async function collectManualReview(dir: string, report: MigrationReport): Promise<void> {
  const pattern = /\b(npm|npx|yarn)\b/;
  for (const name of REVIEW_TARGETS) {
    for (const file of await reviewCandidates(path.join(dir, name))) {
      if (pattern.test(await fs.readFile(file, 'utf8'))) {
        report.manual.push(`${path.relative(dir, file)}: still mentions npm/npx/yarn -- review`);
      }
    }
  }
}

const BUILD_PLACEHOLDER = /^(\s+)(['"]?)([^:'"\n]+)\2: set this to true or false$/gm;
const TRUSTED_BUILDS = new Set([
  '@biomejs/biome',
  '@parcel/watcher',
  '@swc/core',
  'bufferutil',
  'core-js',
  'esbuild',
  'fsevents',
  'msgpackr-extract',
  'sharp',
  'unrs-resolver',
  'utf-8-validate',
  'workerd',
]);

async function resolveBuildPlaceholders(dir: string, report: MigrationReport): Promise<boolean> {
  const file = path.join(dir, WORKSPACE_FILE);
  if (!(await fs.pathExists(file))) return false;
  const original = await fs.readFile(file, 'utf8');
  const next = original.replaceAll(
    BUILD_PLACEHOLDER,
    (_match, indent: string, quote: string, name: string) => {
      const allowed = TRUSTED_BUILDS.has(name);
      report.manual.push(
        `${WORKSPACE_FILE}: allowBuilds ${name} set to ${allowed} -- confirm it needs a build script`,
      );
      return `${indent}${quote}${name}${quote}: ${allowed}`;
    },
  );
  if (next === original) return false;
  await fs.writeFile(file, next, 'utf8');
  return true;
}

async function installDependencies(dir: string, report: MigrationReport): Promise<void> {
  try {
    await execAsync('pnpm install', { cwd: dir });
  } catch (error) {
    const output = `${(error as { stdout?: string }).stdout ?? ''}${(error as { stderr?: string }).stderr ?? ''}`;
    if (
      !output.includes('ERR_PNPM_IGNORED_BUILDS') ||
      !(await resolveBuildPlaceholders(dir, report))
    ) {
      throw error;
    }
    await execAsync('pnpm install', { cwd: dir });
  }
  report.changes.push('pnpm install (generated pnpm-lock.yaml)');
}

export async function migrateToolchain(
  dir: string,
  options: MigrateOptions = {},
): Promise<MigrationReport> {
  const report: MigrationReport = { changes: [], manual: [] };
  await migratePackageJson(dir, report);
  await migrateTextFiles(dir, report);
  await addBunVersion(dir, report);
  await removeForeign(dir, report);
  await collectManualReview(dir, report);

  if (options.install ?? process.env.SPINUP_TS_SKIP_INSTALL !== '1') {
    await installDependencies(dir, report);
  }
  return report;
}

export async function needsToolchainMigration(dir: string): Promise<boolean> {
  if (!(await fs.pathExists(path.join(dir, PKG)))) return false;
  const package_ = (await fs.readJson(path.join(dir, PKG))) as PackageJson;
  const foreignLock = await Promise.all(
    FOREIGN_LOCKFILES.map((name) => fs.pathExists(path.join(dir, name))),
  );
  return (
    !package_.packageManager?.startsWith('pnpm@') ||
    foreignLock.some(Boolean) ||
    !(await fs.pathExists(path.join(dir, WORKSPACE_FILE))) ||
    !(await fs.pathExists(path.join(dir, BUN_VERSION_FILE))) ||
    Object.values(package_.scripts ?? {}).some((c) => rewriteCommands(c) !== c)
  );
}
