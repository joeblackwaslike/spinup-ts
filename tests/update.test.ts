import os from 'node:os';
import path from 'node:path';
import fse from 'fs-extra';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { updateProject } from '../src/update.js';

const dirs: string[] = [];

afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(dirs.splice(0).map((d) => fse.remove(d)));
});

describe('updateProject --yes', () => {
  it('migrates the toolchain and syncs the devcontainer without prompting', async () => {
    vi.stubEnv('SPINUP_TS_SKIP_INSTALL', '1');
    const dir = await fse.mkdtemp(path.join(os.tmpdir(), 'spinup-update-'));
    dirs.push(dir);
    await fse.writeJson(path.join(dir, 'package.json'), {
      name: 'legacy-app',
      scripts: { dev: 'tsx src/index.ts' },
      devDependencies: { tsx: '^4.0.0' },
    });
    await fse.writeFile(path.join(dir, 'yarn.lock'), '');

    await updateProject(dir, { nonInteractive: true });

    const pkg = await fse.readJson(path.join(dir, 'package.json'));
    expect(pkg.scripts.dev).toBe('bun src/index.ts');
    expect(await fse.pathExists(path.join(dir, 'yarn.lock'))).toBe(false);
    const devcontainer = await fse.readFile(
      path.join(dir, '.devcontainer', 'devcontainer.json'),
      'utf8',
    );
    expect(devcontainer).toContain('"name": "legacy-app"');
    expect(devcontainer).toContain('.bun/install/cache');
    expect(devcontainer).not.toContain('__PROJECT_NAME__');
  });
});
