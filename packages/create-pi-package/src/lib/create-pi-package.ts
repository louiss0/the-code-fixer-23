import fs from 'fs-extra';
import path from 'node:path';

import * as prompts from '@clack/prompts';
import color from 'picocolors';

import { getDependencyInstallCommand, installDependencies } from './install-deps';
import { resolveCreateOptions } from './prompts';
import { getDevelopmentPackages } from './templates';
import { writeProjectFiles } from './write-files';
import type { CreatePiPackageInput, CreatePiPackageResult } from './types';

export async function createPiPackage(
  input: CreatePiPackageInput
): Promise<CreatePiPackageResult> {
  const options = await resolveCreateOptions(input);
  const { targetDir, projectName } = options;

  if (await fs.pathExists(targetDir)) {
    const files = await fs.readdir(targetDir);

    if (files.length > 0 && !options.force) {
      const shouldContinue = await prompts.confirm({
        message: `Directory "${targetDir}" is not empty. Continue?`,
        initialValue: false,
      });

      if (!shouldContinue || prompts.isCancel(shouldContinue)) {
        prompts.cancel('Operation cancelled.');
        process.exit(0);
      }
    }
  }

  await fs.ensureDir(targetDir);

  const spinner = prompts.spinner();
  spinner.start('Creating package files...');

  const result = await writeProjectFiles(options);

  spinner.stop('Package files created.');

  const developmentPackages = getDevelopmentPackages(options);

  if (options.install) {
    const installSpinner = prompts.spinner();
    installSpinner.start('Installing development dependencies...');

    try {
      await installDependencies(targetDir, developmentPackages);
      installSpinner.stop('Development dependencies installed.');
    } catch (error) {
      installSpinner.stop('Dependency installation failed.');
      console.error(error);
    }
  }

  const nextDirectory = path.relative(process.cwd(), targetDir) || '.';
  const defaultInstallCommand = getDependencyInstallCommand(
    'npm',
    developmentPackages
  ).join(' ');
  const summaryLines = [
    color.green(`Created ${projectName}!`),
    '',
    'Next steps:',
    `  cd ${nextDirectory}`,
    options.install ? '' : `  ${defaultInstallCommand}`,
    options.install ? '' : `Install dev dependencies: ${defaultInstallCommand}`,
    '  npm run dev',
  ].filter(Boolean);

  prompts.outro(summaryLines.join('\n'));

  return {
    ...result,
    summaryLines,
  };
}
