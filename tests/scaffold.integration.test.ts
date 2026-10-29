import { readFile, rm } from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fse from 'fs-extra';
import { globby } from 'globby';
import { afterEach, describe, expect, it } from 'vitest';
import { replaceTokensInTree } from '../src/scaffold.js';
import { applyTransforms } from '../src/transforms/index.js';
import { type ProjectConfig, toTokenMap } from '../src/types.js';

const TEMPLATE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'template');

const baseConfig: ProjectConfig = {
  projectName: 'my-test-lib',
  projectSlug: 'my_test_lib',
  description: 'A test library',
  author: 'Test Author',
  email: 'test@example.com',
  githubHandle: 'testuser',
  nodeVersion: '22',
  packageManager: 'pnpm',
  projectType: 'library',
  includeGithubActions: true,
  publishToNpm: false,
  includeDocs: true,
  includeCodecov: false,
  includeDockerfile: false,
  includeDevcontainer: true,
  license: 'MIT',
};

const tmpDirs: string[] = [];

afterEach(async () => {
  for (const dir of tmpDirs.splice(0)) {
    await rm(dir, { recursive: true, force: true });
  }
});

async function scaffoldToTemp(config: ProjectConfig): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'ctp-test-'));
  tmpDirs.push(dir);
  await fse.copy(TEMPLATE_DIR, dir);
  await replaceTokensInTree(dir, toTokenMap(config));
  await applyTransforms(dir, config);
  return dir;
}

describe('scaffold integration', () => {
  describe('token replacement', () => {
    it('replaces all tokens in package.json', async () => {
      const dir = await scaffoldToTemp(baseConfig);
      const pkg = await fse.readJson(path.join(dir, 'package.json'));
      expect(pkg.name).toBe('my-test-lib');
      expect(pkg.description).toBe('A test library');
      expect(pkg.license).toBe('MIT');
      expect(pkg.author).toBe('Test Author <test@example.com>');
      expect(pkg.engines).toMatchObject({ node: '>=22' });
      expect(pkg.repository).toMatchObject({
        url: 'git+https://github.com/testuser/my-test-lib.git',
      });
    });

    it('leaves no __TOKEN__ placeholders in any text file', async () => {
      const dir = await scaffoldToTemp(baseConfig);
      const files = await globby('**/*', {
        cwd: dir,
        dot: true,
        onlyFiles: true,
        ignore: ['node_modules/**', '.git/**'],
      });
      const lingering: string[] = [];
      for (const file of files) {
        const content = await readFile(path.join(dir, file), 'utf8').catch(() => null);
        if (content !== null && /__[A-Z_]{3,}__/.test(content)) lingering.push(file);
      }
      expect(lingering).toEqual([]);
    });
  });

  describe('license transform', () => {
    it('creates a single LICENSE file for MIT', async () => {
      const dir = await scaffoldToTemp({ ...baseConfig, license: 'MIT' });
      const licenseFiles = await globby('LICENSE*', { cwd: dir });
      expect(licenseFiles).toEqual(['LICENSE']);
      const content = await readFile(path.join(dir, 'LICENSE'), 'utf8');
      expect(content).toContain('MIT');
    });

    it('creates a single LICENSE file for Apache-2.0', async () => {
      const dir = await scaffoldToTemp({ ...baseConfig, license: 'Apache-2.0' });
      const licenseFiles = await globby('LICENSE*', { cwd: dir });
      expect(licenseFiles).toEqual(['LICENSE']);
      const content = await readFile(path.join(dir, 'LICENSE'), 'utf8');
      expect(content).toContain('Apache');
    });

    it('creates no LICENSE file for UNLICENSED', async () => {
      const dir = await scaffoldToTemp({ ...baseConfig, license: 'UNLICENSED' });
      const licenseFiles = await globby('LICENSE*', { cwd: dir });
      expect(licenseFiles).toEqual([]);
    });
  });

  describe('docs transform', () => {
    it('keeps docs files when includeDocs=true', async () => {
      const dir = await scaffoldToTemp({ ...baseConfig, includeDocs: true });
      expect(await fse.pathExists(path.join(dir, 'docs'))).toBe(true);
      expect(await fse.pathExists(path.join(dir, 'docusaurus.config.ts'))).toBe(true);
      expect(await fse.pathExists(path.join(dir, 'sidebars.ts'))).toBe(true);
    });

    it('removes docs files when includeDocs=false', async () => {
      const dir = await scaffoldToTemp({ ...baseConfig, includeDocs: false });
      expect(await fse.pathExists(path.join(dir, 'docs'))).toBe(false);
      expect(await fse.pathExists(path.join(dir, 'docusaurus.config.ts'))).toBe(false);
      expect(await fse.pathExists(path.join(dir, 'sidebars.ts'))).toBe(false);
    });

    it('strips docs scripts from package.json when includeDocs=false', async () => {
      const dir = await scaffoldToTemp({ ...baseConfig, includeDocs: false });
      const pkg = await fse.readJson(path.join(dir, 'package.json'));
      const scripts = Object.keys(pkg.scripts as Record<string, string>);
      expect(scripts.filter((k) => k.startsWith('docs:'))).toEqual([]);
    });

    it('strips docs devDependencies from package.json when includeDocs=false', async () => {
      const dir = await scaffoldToTemp({ ...baseConfig, includeDocs: false });
      const pkg = await fse.readJson(path.join(dir, 'package.json'));
      const devDeps = pkg.devDependencies as Record<string, string>;
      expect(devDeps).not.toHaveProperty('@docusaurus/core');
      expect(devDeps).not.toHaveProperty('@docusaurus/preset-classic');
    });
  });

  describe('github actions transform', () => {
    it('keeps .github when includeGithubActions=true', async () => {
      const dir = await scaffoldToTemp({ ...baseConfig, includeGithubActions: true });
      expect(await fse.pathExists(path.join(dir, '.github'))).toBe(true);
    });

    it('removes .github when includeGithubActions=false', async () => {
      const dir = await scaffoldToTemp({ ...baseConfig, includeGithubActions: false });
      expect(await fse.pathExists(path.join(dir, '.github'))).toBe(false);
    });
  });

  describe('devcontainer transform', () => {
    it('keeps .devcontainer when includeDevcontainer=true', async () => {
      const dir = await scaffoldToTemp({ ...baseConfig, includeDevcontainer: true });
      expect(await fse.pathExists(path.join(dir, '.devcontainer'))).toBe(true);
    });

    it('removes .devcontainer when includeDevcontainer=false', async () => {
      const dir = await scaffoldToTemp({ ...baseConfig, includeDevcontainer: false });
      expect(await fse.pathExists(path.join(dir, '.devcontainer'))).toBe(false);
    });
  });

  describe('dockerfile transform', () => {
    it('keeps Dockerfile and docker-compose.yml when includeDockerfile=true', async () => {
      const dir = await scaffoldToTemp({ ...baseConfig, includeDockerfile: true });
      expect(await fse.pathExists(path.join(dir, 'Dockerfile'))).toBe(true);
      expect(await fse.pathExists(path.join(dir, 'docker-compose.yml'))).toBe(true);
    });

    it('removes Dockerfile and docker-compose.yml when includeDockerfile=false', async () => {
      const dir = await scaffoldToTemp({ ...baseConfig, includeDockerfile: false });
      expect(await fse.pathExists(path.join(dir, 'Dockerfile'))).toBe(false);
      expect(await fse.pathExists(path.join(dir, 'docker-compose.yml'))).toBe(false);
    });
  });

  describe('package manager transform', () => {
    it('adds packageManager field and renames lint-staged for pnpm', async () => {
      const dir = await scaffoldToTemp({ ...baseConfig, packageManager: 'pnpm' });
      const pkg = await fse.readJson(path.join(dir, 'package.json'));
      expect(pkg.packageManager).toMatch(/^pnpm@/);
      expect(pkg).toHaveProperty('lint-staged');
      expect(pkg).not.toHaveProperty('__lint-staged__');
    });

    it('ships Bun runtime files and no tsx', async () => {
      const dir = await scaffoldToTemp({ ...baseConfig });
      const pkg = await fse.readJson(path.join(dir, 'package.json'));
      expect(pkg.scripts.dev).toBe('bun --watch src/index.ts');
      expect(pkg.devDependencies).not.toHaveProperty('tsx');
      expect(await fse.pathExists(path.join(dir, '.bun-version'))).toBe(true);
    });
  });
});
