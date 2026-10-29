import { exec } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import fse from 'fs-extra';
import type { ProjectConfig } from '../types.js';

const execAsync = promisify(exec);

interface PackageJson {
  packageManager?: string;
  [key: string]: unknown;
}

async function resolveVersion(pm: string): Promise<string> {
  try {
    const { stdout } = await execAsync(`${pm} --version`);
    return stdout.trim();
  } catch {
    return '0.0.0';
  }
}

export async function transformPackageManager(
  destDir: string,
  config: ProjectConfig,
): Promise<void> {
  const packagePath = path.join(destDir, 'package.json');
  if (!(await fse.pathExists(packagePath))) return;

  const packageJson = (await fse.readJson(packagePath)) as PackageJson;
  const version = await resolveVersion(config.packageManager);
  packageJson.packageManager = `${config.packageManager}@${version}`;

  // Rename placeholder key so the scaffolded project gets a real lint-staged config
  if ('__lint-staged__' in packageJson) {
    packageJson['lint-staged'] = packageJson['__lint-staged__'];
    Reflect.deleteProperty(packageJson, '__lint-staged__');
  }

  await fse.writeJson(packagePath, packageJson, { spaces: 2 });
}
