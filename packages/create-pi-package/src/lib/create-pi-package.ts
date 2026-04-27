import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { defaultChoices, defaultScope, managedFilePaths } from './constants.js';
import { readOptionalFile, writeManagedFile } from './io.js';
import { isKebabCaseName } from './name.js';
import { selectChoice } from './prompt.js';
import { getManagedFileContentByPath } from './templates.js';
import type {
  CreatePiPackageOptions,
  CreatePiPackageResult,
  PackageMode,
  TestRunner,
  ToolingPreset,
} from './types.js';

export async function createPiPackage(
  options: CreatePiPackageOptions,
): Promise<CreatePiPackageResult> {
  const targetDirectory = path.resolve(options.directory ?? process.cwd());
  const packageName = resolvePackageName(targetDirectory, options.name);
  const tooling = await resolveOption(
    'tooling',
    options.tooling,
    options.yes,
    ['eslint-prettier', 'biome'],
    defaultChoices.tooling,
  );
  const testRunner = await resolveOption(
    'test runner',
    options.testRunner,
    options.yes,
    ['vitest', 'jest'],
    defaultChoices.testRunner,
  );
  const mode = await resolveOption(
    'mode',
    options.mode,
    options.yes,
    ['source', 'bundle'],
    defaultChoices.mode,
  );

  await mkdir(targetDirectory, { recursive: true });

  const managedFiles = getManagedFileContentByPath({
    mode: mode as PackageMode,
    packageName,
    testRunner: testRunner as TestRunner,
    tooling: tooling as ToolingPreset,
  });

  const createdFiles: string[] = [];
  const overwrittenFiles: string[] = [];
  const skippedFiles: string[] = [];

  for (const relativeFilePath of managedFilePaths) {
    const content = managedFiles.get(relativeFilePath);
    if (content === undefined) {
      continue;
    }

    const absoluteFilePath = path.join(targetDirectory, relativeFilePath);
    const existingContent = await readOptionalFile(absoluteFilePath);

    if (existingContent === null) {
      await writeManagedFile(absoluteFilePath, content);
      createdFiles.push(relativeFilePath);
      continue;
    }

    if (existingContent === content) {
      continue;
    }

    if (!options.force) {
      skippedFiles.push(relativeFilePath);
      continue;
    }

    await writeManagedFile(absoluteFilePath, content);
    overwrittenFiles.push(relativeFilePath);
  }

  const summaryLines = [
    `Package: ${defaultScope}/${packageName}`,
    `Directory: ${targetDirectory}`,
    `Mode: ${mode}`,
    `Tooling: ${tooling}`,
    `Test runner: ${testRunner}`,
    createdFiles.length > 0
      ? `Created: ${createdFiles.join(', ')}`
      : 'Created: none',
    overwrittenFiles.length > 0
      ? `Overwritten: ${overwrittenFiles.join(', ')}`
      : 'Overwritten: none',
    skippedFiles.length > 0
      ? `Skipped: ${skippedFiles.join(', ')}`
      : 'Skipped: none',
    'Next steps:',
    '  npm install',
    '  npm run check',
  ];

  return {
    createdFiles,
    overwrittenFiles,
    skippedFiles,
    summaryLines,
  };
}

function resolvePackageName(targetDirectory: string, explicitName?: string) {
  const packageName = explicitName ?? path.basename(targetDirectory);
  if (!isKebabCaseName(packageName)) {
    throw new Error(
      `Package name must be kebab-case. Rename the directory or pass --name with a kebab-case value. Received: ${packageName}`,
    );
  }
  return packageName;
}

async function resolveOption<T extends string>(
  label: string,
  value: T | undefined,
  yes: boolean | undefined,
  choices: readonly T[],
  defaultChoice: T,
): Promise<T> {
  if (value !== undefined) {
    return value;
  }

  if (yes) {
    return defaultChoice;
  }

  return selectChoice({
    choices,
    defaultChoice,
    label,
  });
}

export function directoryContainsFiles(targetDirectory: string) {
  if (!existsSync(targetDirectory)) {
    return false;
  }

  return true;
}
