import os from 'node:os';
import path from 'node:path';
import fse from 'fs-extra';
import { afterEach, describe, expect, it } from 'vitest';
import {
  addSetupBun,
  migrateToolchain,
  needsToolchainMigration,
  rewriteCommands,
} from '../src/migrate.js';

const dirs: string[] = [];

async function legacyProject(): Promise<string> {
  const dir = await fse.mkdtemp(path.join(os.tmpdir(), 'spinup-migrate-'));
  dirs.push(dir);
  await fse.writeJson(path.join(dir, 'package.json'), {
    name: 'legacy',
    scripts: { dev: 'tsx watch src/index.ts', lint: 'npx biome ci .', test: 'npm run vitest' },
    devDependencies: { tsx: '^4.0.0' },
    workspaces: ['packages/*'],
    pnpm: { onlyBuiltDependencies: ['esbuild'] },
  });
  await fse.writeFile(path.join(dir, 'package-lock.json'), '{}');
  await fse.ensureDir(path.join(dir, 'node_modules', 'x'));
  await fse.ensureDir(path.join(dir, '.husky'));
  await fse.writeFile(path.join(dir, '.husky', 'pre-commit'), 'npx lint-staged\n');
  await fse.ensureDir(path.join(dir, '.github', 'workflows'));
  await fse.writeFile(
    path.join(dir, '.github', 'workflows', 'ci.yml'),
    'steps:\n  - uses: actions/checkout@v4\n  - name: Setup pnpm\n    uses: pnpm/action-setup@v4\n  - run: npm ci\n',
  );
  await fse.writeFile(path.join(dir, 'README.md'), 'npm install legacy\n');
  return dir;
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => fse.remove(d)));
});

describe('rewriteCommands', () => {
  it('maps npm/npx/yarn/tsx to pnpm/bunx/bun', () => {
    expect(rewriteCommands('npx -y eslint .')).toBe('bunx eslint .');
    expect(rewriteCommands('npm run build && yarn test')).toBe('pnpm build && pnpm test');
    expect(rewriteCommands('tsx scripts/x.ts')).toBe('bun scripts/x.ts');
    expect(rewriteCommands('npm ci')).toBe('pnpm install --frozen-lockfile');
  });

  it('leaves npm publish and global npm installs alone, and maps --workspace to --filter', () => {
    expect(rewriteCommands('npm publish --provenance')).toBe('npm publish --provenance');
    expect(rewriteCommands('npm install -g npm@latest')).toBe('npm install -g npm@latest');
    expect(rewriteCommands('npm run build --workspace=dashboard')).toBe(
      'pnpm --filter dashboard build',
    );
  });

  it('keeps yarn install and rewrites npx tsx to a single bun', () => {
    expect(rewriteCommands('yarn install --frozen-lockfile')).toBe(
      'pnpm install --frozen-lockfile',
    );
    expect(rewriteCommands('yarn add zod')).toBe('pnpm add zod');
    expect(rewriteCommands('npx tsx script.ts')).toBe('bun script.ts');
  });
});

describe('addSetupBun', () => {
  it('inserts Bun setup before the pnpm action and is idempotent', () => {
    const once = addSetupBun('steps:\n  - name: Setup pnpm\n    uses: pnpm/action-setup@v4\n');
    expect(once).toContain('oven-sh/setup-bun@v2');
    expect(once.indexOf('setup-bun')).toBeLessThan(once.indexOf('Setup pnpm'));
    expect(addSetupBun(once)).toBe(once);
  });
});

describe('migrateToolchain', () => {
  it('migrates a legacy npm project and removes old artifacts', async () => {
    const dir = await legacyProject();
    expect(await needsToolchainMigration(dir)).toBe(true);

    const report = await migrateToolchain(dir, { install: false });

    const pkg = await fse.readJson(path.join(dir, 'package.json'));
    expect(pkg.packageManager).toMatch(/^pnpm@/);
    expect(pkg.scripts.dev).toBe('bun --watch src/index.ts');
    expect(pkg.scripts.lint).toBe('bunx biome ci .');
    expect(pkg.devDependencies.tsx).toBeUndefined();
    expect(pkg.workspaces).toBeUndefined();
    expect(pkg.pnpm).toBeUndefined();
    const workspace = await fse.readFile(path.join(dir, 'pnpm-workspace.yaml'), 'utf8');
    expect(workspace).toContain("- 'packages/*'");
    expect(workspace).toContain("'esbuild': true");
    expect(await fse.pathExists(path.join(dir, 'package-lock.json'))).toBe(false);
    expect(await fse.pathExists(path.join(dir, 'node_modules'))).toBe(false);
    expect(await fse.readFile(path.join(dir, '.husky', 'pre-commit'), 'utf8')).toBe(
      'bunx lint-staged\n',
    );
    const ci = await fse.readFile(path.join(dir, '.github', 'workflows', 'ci.yml'), 'utf8');
    expect(ci).toContain('setup-bun');
    expect(ci).toContain('pnpm install --frozen-lockfile');
    expect(await fse.readFile(path.join(dir, '.bun-version'), 'utf8')).toMatch(/^\d+\.\d+\.\d+/);
    expect(report.manual.some((m) => m.startsWith('README.md'))).toBe(true);
    expect(await needsToolchainMigration(dir)).toBe(false);
  });
});

describe('migrateToolchain edge cases', () => {
  it('needsToolchainMigration is false when there is no package.json', async () => {
    const dir = await fse.mkdtemp(path.join(os.tmpdir(), 'spinup-empty-'));
    dirs.push(dir);
    expect(await needsToolchainMigration(dir)).toBe(false);
  });

  it('leaves workspaces in place when pnpm-workspace.yaml already exists', async () => {
    const dir = await legacyProject();
    await fse.writeFile(path.join(dir, 'pnpm-workspace.yaml'), "packages:\n  - 'apps/*'\n");
    const report = await migrateToolchain(dir, { install: false });
    const package_ = await fse.readJson(path.join(dir, 'package.json'));
    expect(package_.workspaces).toEqual(['packages/*']);
    expect(report.manual.some((m) => m.includes('pnpm-workspace.yaml already exists'))).toBe(true);
  });
});
