import type { PackageManager } from './types';

export function detectPackageManager(environment = process.env): PackageManager {
  const userAgent = environment.npm_config_user_agent ?? '';

  if (userAgent.startsWith('pnpm')) return 'pnpm';
  if (userAgent.startsWith('yarn')) return 'yarn';
  if (userAgent.startsWith('bun')) return 'bun';
  if (userAgent.startsWith('npm')) return 'npm';

  const execPath = environment.npm_execpath ?? '';

  if (execPath.includes('pnpm')) return 'pnpm';
  if (execPath.includes('yarn')) return 'yarn';
  if (execPath.includes('bun')) return 'bun';

  return 'npm';
}

export function getInstallCommand(packageManager: PackageManager) {
  switch (packageManager) {
    case 'pnpm':
      return ['pnpm', 'install'] as const;
    case 'yarn':
      return ['yarn', 'install'] as const;
    case 'bun':
      return ['bun', 'install'] as const;
    case 'npm':
      return ['npm', 'install'] as const;
  }
}
