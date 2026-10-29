import { z } from 'zod';

/**
 * Map of template placeholder tokens to their concrete string replacements.
 * Every key is replaced verbatim inside template files during scaffolding.
 */
/** Map of `__UPPER_SNAKE__` template placeholders to their replacement values. */
export type TokenMap = Record<string, string>;

/**
 * Zod schema describing every user-selectable option for a scaffolded project.
 * Source of truth for the interactive CLI prompts and template token resolution.
 */
export const projectConfigSchema = z
  .object({
    /** kebab-case project slug, e.g. "my-awesome-lib" */
    projectName: z.string().min(1),
    /** snake_case version of `projectName`, auto-derived via `deriveSlug` */
    projectSlug: z.string().min(1),
    description: z.string(),
    author: z.string().min(1),
    email: z.string().email(),
    githubHandle: z.string().min(1),
    nodeVersion: z.enum(['20', '22', '23']).default('22'),
    // Legacy values are accepted for old configs but always resolve to pnpm.
    packageManager: z
      .enum(['pnpm', 'bun', 'npm'])
      .default('pnpm')
      .transform((): 'pnpm' => 'pnpm'),
    projectType: z.enum(['library', 'cli', 'server', 'mcp-server']).default('library'),
    includeGithubActions: z.boolean().default(true),
    publishToNpm: z.boolean().default(false),
    /** Include a Docusaurus docs site under `docs/` */
    includeDocs: z.boolean().default(false),
    includeCodecov: z.boolean().default(false),
    includeDockerfile: z.boolean().default(false),
    includeDevcontainer: z.boolean().default(true),
    license: z
      .enum(['MIT', 'Apache-2.0', 'BSD-3-Clause', 'ISC', 'GPL-3.0', 'UNLICENSED'])
      .default('MIT'),
  })
  .strict();

export type ProjectConfig = z.infer<typeof projectConfigSchema>;

export const userDefaultsSchema = projectConfigSchema
  .omit({ projectName: true, projectSlug: true, description: true })
  .partial();

export type UserDefaults = z.infer<typeof userDefaultsSchema>;

/** Convert a kebab-case identifier to snake_case. */
export function deriveSlug(name: string): string {
  return name.replaceAll('-', '_');
}

/** Build the template token map from a validated {@link ProjectConfig}. */
export function toTokenMap(config: ProjectConfig): TokenMap {
  return Object.fromEntries([
    ['__PROJECT_NAME__', config.projectName],
    ['__PROJECT_SLUG__', config.projectSlug],
    ['__DESCRIPTION__', config.description],
    ['__AUTHOR__', config.author],
    ['__EMAIL__', config.email],
    ['__GITHUB_HANDLE__', config.githubHandle],
    ['__NODE_VERSION__', config.nodeVersion],
    ['__YEAR__', String(new Date().getFullYear())],
    ['__LICENSE__', config.license],
  ]);
}
