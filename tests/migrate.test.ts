import os from 'node:os';
import path from 'node:path';
import fse from 'fs-extra';
import { afterEach, describe, expect, it } from 'vitest';
import {
  addSetupBun,
  addSetupPnpm,
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

describe('addSetupPnpm', () => {
  it('adds pnpm before every setup-node, switches the cache, and chains with setup-bun', () => {
    const yaml = [
      'jobs:',
      '  a:',
      '    steps:',
      '      - uses: actions/checkout@v4',
      '      - uses: actions/setup-node@v4',
      '        with:',
      '          cache: npm',
      '      - run: pnpm install --frozen-lockfile',
      '  b:',
      '    steps:',
      '      - uses: actions/setup-node@v4',
      '      - run: pnpm test',
      '',
    ].join('\n');
    const out = addSetupBun(addSetupPnpm(yaml));
    expect(out.match(/pnpm\/action-setup@v4/g)).toHaveLength(2);
    expect(out.match(/oven-sh\/setup-bun@v2/g)).toHaveLength(2);
    expect(out).toContain('cache: pnpm');
    expect(addSetupBun(addSetupPnpm(out))).toBe(out);
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

describe('package.json indentation', () => {
  it('keeps tab indentation when migrating', async () => {
    const dir = await fse.mkdtemp(path.join(os.tmpdir(), 'spinup-indent-'));
    dirs.push(dir);
    await fse.writeFile(
      path.join(dir, 'package.json'),
      '{\n\t"name": "tabbed",\n\t"scripts": {\n\t\t"test": "npm test"\n\t}\n}\n',
    );
    await migrateToolchain(dir, { install: false });
    const raw = await fse.readFile(path.join(dir, 'package.json'), 'utf8');
    expect(raw).toContain('\n\t"name"');
    expect(raw).toContain('"test": "pnpm test"');
  });
});

describe('workflow edge cases', () => {
  it('switches quoted npm caches and raises old Node versions for pnpm', () => {
    const input =
      'steps:\n  - uses: actions/setup-node@v4\n    with:\n      node-version: "20"\n      cache: \'npm\'\n  - run: pnpm install\n';
    const output = addSetupPnpm(input);
    expect(output).toContain('node-version: "22"');
    expect(output).toContain("cache: 'pnpm'");
  });

  it('does not add a second pnpm setup when the job already has one after setup-node', () => {
    const input =
      'jobs:\n  test:\n    steps:\n      - uses: actions/setup-node@v4\n      - uses: pnpm/action-setup@v4\n      - run: pnpm test\n';
    const output = addSetupPnpm(input);
    expect(output.match(/pnpm\/action-setup/g)).toHaveLength(1);
    expect(addSetupBun(output).match(/setup-bun/g)).toHaveLength(1);
  });

  it('still adds setup to each job that lacks it', () => {
    const input =
      'jobs:\n  a:\n    steps:\n      - uses: actions/setup-node@v4\n      - run: pnpm test\n  b:\n    steps:\n      - uses: actions/setup-node@v4\n      - run: pnpm build\n';
    expect(addSetupPnpm(input).match(/pnpm\/action-setup/g)).toHaveLength(2);
  });

  it('drops a pinned pnpm action version that conflicts with packageManager', () => {
    const input =
      'steps:\n  - uses: pnpm/action-setup@v4\n    with:\n      version: 11\n  - uses: actions/setup-node@v4\n  - run: pnpm test\n';
    const output = addSetupPnpm(input);
    expect(output).not.toContain('version: 11');
    expect(output).not.toContain('with:\n  - uses: actions/setup-node');
  });

  it('keeps other pnpm action inputs when dropping the version', () => {
    const input =
      'steps:\n  - uses: pnpm/action-setup@v4\n    with:\n      version: 11\n      run_install: false\n  - run: pnpm test\n';
    const output = addSetupPnpm(input);
    expect(output).toContain('run_install: false');
    expect(output).not.toContain('version: 11');
  });
});

describe('build placeholders and nested apps', () => {
  it('resolves allowBuilds placeholders even without installing', async () => {
    const dir = await legacyProject();
    await fse.writeFile(
      path.join(dir, 'pnpm-workspace.yaml'),
      'allowBuilds:\n  esbuild: set this to true or false\n  core-js: set this to true or false\n',
    );
    await migrateToolchain(dir, { install: false });
    const yaml = await fse.readFile(path.join(dir, 'pnpm-workspace.yaml'), 'utf8');
    expect(yaml).toContain('esbuild: true');
    expect(yaml).toContain('core-js: false');
  });

  it('builds a root workspace over nested apps that have no root package.json', async () => {
    const dir = await fse.mkdtemp(path.join(os.tmpdir(), 'spinup-nested-'));
    dirs.push(dir);
    for (const app of ['platform/ui', 'platform/dashboard']) {
      await fse.outputJson(path.join(dir, app, 'package.json'), {
        name: path.basename(app),
        scripts: { build: 'npm run compile' },
      });
      await fse.outputFile(path.join(dir, app, 'package-lock.json'), '{}');
    }
    expect(await needsToolchainMigration(dir)).toBe(true);
    const report = await migrateToolchain(dir, { install: false });
    const root = await fse.readJson(path.join(dir, 'package.json'));
    expect(root.private).toBe(true);
    expect(root.packageManager).toMatch(/^pnpm@/);
    const yaml = await fse.readFile(path.join(dir, 'pnpm-workspace.yaml'), 'utf8');
    expect(yaml).toContain('platform/dashboard');
    expect(yaml).toContain('platform/ui');
    expect(await fse.pathExists(path.join(dir, 'platform/ui/package-lock.json'))).toBe(false);
    expect((await fse.readJson(path.join(dir, 'platform/ui/package.json'))).scripts.build).toBe(
      'pnpm compile',
    );
    expect(report.manual.some((m) => m.includes('re-resolved'))).toBe(true);
  });

  it('does nothing when there is no package.json anywhere', async () => {
    const dir = await fse.mkdtemp(path.join(os.tmpdir(), 'spinup-none-'));
    dirs.push(dir);
    expect(await migrateToolchain(dir, { install: false })).toEqual({ changes: [], manual: [] });
  });
});
