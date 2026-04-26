import path from 'node:path';

import * as prompts from '@clack/prompts';
import color from 'picocolors';

import type {
  Bundler,
  CreatePiPackageInput,
  CreatePiPackageOptions,
  Formatter,
  Linter,
  ProjectFeature,
  TestRunner,
} from './types';

export async function resolveCreateOptions(input: CreatePiPackageInput) {
  prompts.intro(color.bgMagenta(color.white(' create-pi-package ')));

  const directory = await resolveDirectory(input.directory);
  const selectedFeatures = await resolveFeatures(input);
  const includesExtension = selectedFeatures.includes('extensions');
  const linter = await resolveLinter(input.linter);
  const formatter = await resolveFormatter(linter, input.formatter);
  const bundle = includesExtension ? await resolveBundle(input.bundle) : false;
  const bundler = includesExtension && bundle
    ? await resolveBundler(input.bundler)
    : undefined;
  const testRunner = includesExtension
    ? await resolveTestRunner(input.testRunner)
    : undefined;
  const install = await resolveInstall(input.install);
  const targetDir = path.resolve(process.cwd(), directory);

  return {
    projectName: getDefaultProjectName(directory),
    targetDir,
    bundle,
    bundler,
    formatter,
    linter,
    testRunner,
    features: {
      extensions: selectedFeatures.includes('extensions'),
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
    message: 'Do you want to bundle this extension package?',
    initialValue: true,
  });

  return getPromptValue(answer);
}

async function resolveBundler(bundler: Bundler | undefined) {
  if (bundler !== undefined) {
    return bundler;
  }

  const answer = await prompts.select({
    message: 'Which bundler do you want to use for extensions?',
    options: [
      { value: 'tsup', label: 'tsup', hint: 'Simple extension bundling' },
      { value: 'vite', label: 'vite', hint: 'Flexible plugin ecosystem' },
    ],
    initialValue: 'tsup',
  });

  return getPromptValue(answer) as Bundler;
}

async function resolveFormatter(linter: Linter, formatter: Formatter | undefined) {
  const choices = getFormatterChoices(linter);

  if (formatter === undefined) {
    return choices[0];
  }

  if (formatter !== undefined) {
    if (!choices.includes(formatter)) {
      throw new Error(`Formatter '${formatter}' cannot be used with linter '${linter}'.`);
    }

    return formatter;
  }

  const answer = await prompts.select({
    message: 'Which formatter do you want?',
    options: choices.map((choice) => ({ value: choice, label: getFormatterLabel(choice) })),
    initialValue: choices[0],
  });

  return getPromptValue(answer) as Formatter;
}

async function resolveLinter(linter: Linter | undefined) {
  return linter ?? 'eslint';
}

async function resolveTestRunner(testRunner: TestRunner | undefined) {
  if (testRunner !== undefined) {
    return testRunner;
  }

  const answer = await prompts.select({
    message: 'Which test runner do you want for extensions?',
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
    input.extensions ? 'extensions' : undefined,
    input.prompts ? 'prompts' : undefined,
    input.themes ? 'themes' : undefined,
    input.skills ? 'skills' : undefined,
  ].filter((feature): feature is ProjectFeature => feature !== undefined);

  if (selectedFeatures.length > 0) {
    return selectedFeatures;
  }

  const answer = await prompts.multiselect({
    message: 'What are you developing?',
    required: true,
    options: [
      {
        value: 'extensions',
        label: 'Extensions',
        hint: 'Custom tools, commands, and runtime behavior',
      },
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
    initialValues: ['extensions'],
  });

  return getPromptValue(answer) as ProjectFeature[];
}

async function resolveInstall(install: boolean | undefined) {
  return install ?? true;
}

function getFormatterChoices(linter: Linter): Formatter[] {
  if (linter === 'biome') {
    return ['prettier'];
  }

  return ['prettier', 'stylistic', 'biome'];
}

function getFormatterLabel(formatter: Formatter) {
  if (formatter === 'stylistic') {
    return 'ESLint Stylistic';
  }

  if (formatter === 'biome') {
    return 'Biome';
  }

  return 'Prettier';
}

function getPromptValue<TValue>(value: TValue | symbol) {
  if (prompts.isCancel(value)) {
    prompts.cancel('Operation cancelled.');
    process.exit(0);
  }

  return value;
}
