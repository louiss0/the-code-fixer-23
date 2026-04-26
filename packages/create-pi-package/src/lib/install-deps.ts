import { execa } from 'execa';

import { detectPackageManager, getInstallCommand } from './detect-package-manager';

export async function installDependencies(cwd: string) {
  const packageManager = detectPackageManager();
  const [command, ...args] = getInstallCommand(packageManager);

  await execa(command, args, {
    cwd,
    stdio: 'inherit',
  });
}
