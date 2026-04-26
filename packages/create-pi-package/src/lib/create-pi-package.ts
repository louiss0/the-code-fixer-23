import fs from 'fs-extra';
import path from 'node:path';

import * as prompts from '@clack/prompts';
import color from 'picocolors';

import { installDependencies } from './install-deps';
import { resolveCreateOptions } from './prompts';
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

  if (options.install) {
    const installSpinner = prompts.spinner();
    installSpinner.start('Installing dependencies...');

    try {
      await installDependencies(targetDir);
      installSpinner.stop('Dependencies installed.');
    } catch (error) {
      installSpinner.stop('Dependency installation failed.');
      console.error(error);
    }
  }

  const nextDirectory = path.relative(process.cwd(), targetDir) || '.';
  const summaryLines = [
    color.green(`Created ${projectName}!`),
    '',
    'Next steps:',
    `  cd ${nextDirectory}`,
    options.install ? '' : '  npm install',
    '  npm run dev',
  ].filter(Boolean);

  prompts.outro(summaryLines.join('\n'));

  return {
    ...result,
    summaryLines,
  };
}
