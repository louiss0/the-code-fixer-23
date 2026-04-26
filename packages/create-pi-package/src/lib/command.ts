import { Command, InvalidArgumentError } from '@commander-js/extra-typings';

import type { Bundler, CreatePiPackageInput, TestRunner } from './types';

type CreatePiPackageAction = (input: CreatePiPackageInput) => Promise<void>;

export function createCommand(action: CreatePiPackageAction, version: string) {
  const program = new Command();

  program
    .name('create-pi-package')
    .description(
      'Create a new PI package with prompts, themes, skills, bundling, and tests.'
    )
    .version(version)
    .argument('[directory]', 'Folder to create the package in')
    .option('--bundle', 'Enable bundling')
    .option('--no-bundle', 'Disable bundling')
    .option('--bundler <bundler>', 'Bundler to use: tsup or vite', parseBundler)
    .option(
      '--test-runner <runner>',
      'Test runner to use: vitest or jest',
      parseTestRunner
    )
    .option('--prompts', 'Generate prompt templates')
    .option('--themes', 'Generate theme templates')
    .option('--skills', 'Generate skill templates')
    .option('--install', 'Install dependencies after scaffolding')
    .option('--no-install', 'Skip dependency installation')
    .option('--force', 'Overwrite managed scaffold files')
    .action(async (directory, options) => {
      await action({
        directory,
        bundle: options.bundle,
        bundler: options.bundler,
        testRunner: options.testRunner,
        prompts: options.prompts,
        themes: options.themes,
        skills: options.skills,
        install: options.install,
        force: options.force,
      });
    });

  return program;
}

function parseBundler(value: string): Bundler {
  if (value !== 'tsup' && value !== 'vite') {
    throw new InvalidArgumentError("Bundler must be either 'tsup' or 'vite'.");
  }

  return value;
}

function parseTestRunner(value: string): TestRunner {
  if (value !== 'vitest' && value !== 'jest') {
    throw new InvalidArgumentError(
      "Test runner must be either 'vitest' or 'jest'."
    );
  }

  return value;
}
