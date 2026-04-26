import path from 'node:path';

import * as prompts from '@clack/prompts';
import color from 'picocolors';

import type {
  Bundler,
  CreatePiPackageInput,
  CreatePiPackageOptions,
  TestRunner,
} from './types';

export async function resolveCreateOptions(input: CreatePiPackageInput) {
  prompts.intro(color.bgMagenta(color.white(' create-pi-package ')));

  const directory = await resolveDirectory(input.directory);
  const bundle = await resolveBundle(input.bundle);
  const bundler = bundle ? await resolveBundler(input.bundler) : undefined;
  const testRunner = await resolveTestRunner(input.testRunner);
  const selectedFeatures = await resolveFeatures(input);
  const install = await resolveInstall(input.install);
  const targetDir = path.resolve(process.cwd(), directory);

  return {
    projectName: getDefaultProjectName(directory),
    targetDir,
    bundle,
    bundler,
    testRunner,
    features: {
      prompts: selectedFeatures.includes('prompts'),
      themes: selectedFeatures.includes('themes'),
      skills: selectedFeatures.includes('skills'),
    },
    install,
    force: input.force ?? false,
  } satisfies CreatePiPackageOptions;
}

function getDefaultProjectName(directory: string) {
  if (directory === '.') {
    return path.basename(process.cwd());
  }

  return path.basename(path.resolve(directory));
}

async function resolveDirectory(directory: string | undefined) {
  if (directory !== undefined) {
    return directory;
  }

  const answer = await prompts.text({
    message: 'Where should the package be created?',
    placeholder: '.',
    defaultValue: '.',
  });

  return getPromptValue(answer);
}

async function resolveBundle(bundle: boolean | undefined) {
  if (typeof bundle === 'boolean') {
    return bundle;
  }

  const answer = await prompts.confirm({
    message: 'Do you want to bundle this package?',
    initialValue: true,
  });

  return getPromptValue(answer);
}

async function resolveBundler(bundler: Bundler | undefined) {
  if (bundler !== undefined) {
    return bundler;
  }

  const answer = await prompts.select({
    message: 'Which bundler do you want to use?',
    options: [
      { value: 'tsup', label: 'tsup', hint: 'Simple library bundling' },
      { value: 'vite', label: 'vite', hint: 'Flexible plugin ecosystem' },
    ],
    initialValue: 'tsup',
  });

  return getPromptValue(answer) as Bundler;
}

async function resolveTestRunner(testRunner: TestRunner | undefined) {
  if (testRunner !== undefined) {
    return testRunner;
  }

  const answer = await prompts.select({
    message: 'Which test runner do you want?',
    options: [
      { value: 'vitest', label: 'Vitest', hint: 'Fast Vite-native tests' },
      { value: 'jest', label: 'Jest', hint: 'Classic test runner' },
    ],
    initialValue: 'vitest',
  });

  return getPromptValue(answer) as TestRunner;
}

async function resolveFeatures(input: CreatePiPackageInput) {
  const selectedFeatures = [
    input.prompts ? 'prompts' : undefined,
    input.themes ? 'themes' : undefined,
    input.skills ? 'skills' : undefined,
  ].filter((feature): feature is string => feature !== undefined);

  if (selectedFeatures.length > 0) {
    return selectedFeatures;
  }

  const answer = await prompts.multiselect({
    message: 'What are you developing?',
    required: true,
    options: [
      {
        value: 'prompts',
        label: 'Prompts',
        hint: 'Reusable model instructions',
      },
      {
        value: 'themes',
        label: 'Themes',
        hint: 'Visual/style configuration',
      },
      {
        value: 'skills',
        label: 'Skills',
        hint: 'Agent skill folders and docs',
      },
    ],
    initialValues: ['prompts'],
  });

  return getPromptValue(answer);
}

async function resolveInstall(install: boolean | undefined) {
  if (typeof install === 'boolean') {
    return install;
  }

  const answer = await prompts.confirm({
    message: 'Install dependencies?',
    initialValue: true,
  });

  return getPromptValue(answer);
}

function getPromptValue<TValue>(value: TValue | symbol) {
  if (prompts.isCancel(value)) {
    prompts.cancel('Operation cancelled.');
    process.exit(0);
  }

  return value;
}
