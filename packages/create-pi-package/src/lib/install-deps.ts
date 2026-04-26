import { execa } from 'execa';

import {
  detectPackageManager,
  getInstallCommand,
} from './detect-package-manager';
import type { PackageManager } from './types';

export async function installDependencies(
  cwd: string,
  packages: string[] = []
) {
  const packageManager = detectPackageManager();
  const [command, ...args] =
    packages.length > 0
      ? getDependencyInstallCommand(packageManager, packages)
      : getInstallCommand(packageManager);

  await execa(command, args, {
    cwd,
    stdio: 'inherit',
  });
}

export function getDependencyInstallCommand(
  packageManager: PackageManager,
  packages: string[]
) {
  switch (packageManager) {
    case 'pnpm':
      return ['pnpm', 'add', '--save-dev', ...packages];
    case 'yarn':
      return ['yarn', 'add', '--dev', ...packages];
    case 'bun':
      return ['bun', 'add', '--dev', ...packages];
    case 'npm':
      return ['npm', 'install', '--save-dev', ...packages];
  }
}
