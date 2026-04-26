import { Command, InvalidArgumentError } from '@commander-js/extra-typings';

import type {
  CreatePiPackageOptions,
  PackageMode,
  TestRunner,
  ToolingPreset,
} from './types.js';

export interface ParsedCommand {
  options: CreatePiPackageOptions;
  showHelp: boolean;
}

export function createCommand() {
  return new Command()
    .name('create-pi-package')
    .description('Create a PI package scaffold with source or bundle output.')
    .argument('[directory]', 'Target directory')
    .option(
      '--directory <path>',
      'Target directory. Defaults to current directory.'
    )
    .option('--name <name>', 'Explicit kebab-case package leaf name.')
    .option(
      '--tooling <preset>',
      'Tooling preset: eslint-prettier or biome',
      parseTooling
    )
    .option(
      '--test-runner <runner>',
      'Test runner: vitest or jest',
      parseTestRunner
    )
    .option('--mode <mode>', 'Package mode: source or bundle', parseMode)
    .option('--yes', 'Accept recommended defaults for omitted choices.')
    .option('--force', 'Overwrite managed scaffold files.')
    .helpOption('--help, -h', 'Show help.');
}

export function parseCommand(args: string[]): ParsedCommand {
  const command = createCommand()
    .exitOverride()
    .configureOutput({
      writeOut: () => undefined,
      writeErr: () => undefined,
    });

  try {
    command.parse(args, { from: 'user' });
  } catch (error) {
    if (isHelpError(error)) {
      return { options: {}, showHelp: true };
    }

    throw error;
  }

  const parsedOptions = command.opts();
  const positionalDirectory = command.args.at(0);

  return {
    options: {
      directory: parsedOptions.directory ?? positionalDirectory,
      force: parsedOptions.force,
      mode: parsedOptions.mode,
      name: parsedOptions.name,
      testRunner: parsedOptions.testRunner,
      tooling: parsedOptions.tooling,
      yes: parsedOptions.yes,
    },
    showHelp: false,
  };
}

export function getHelpText() {
  return createCommand().helpInformation();
}

function parseTooling(value: string): ToolingPreset {
  if (value !== 'eslint-prettier' && value !== 'biome') {
    throw new InvalidArgumentError(
      'Tooling preset must be eslint-prettier or biome.'
    );
  }

  return value;
}

function parseTestRunner(value: string): TestRunner {
  if (value !== 'vitest' && value !== 'jest') {
    throw new InvalidArgumentError('Test runner must be vitest or jest.');
  }

  return value;
}

function parseMode(value: string): PackageMode {
  if (value !== 'source' && value !== 'bundle') {
    throw new InvalidArgumentError('Package mode must be source or bundle.');
  }

  return value;
}

function isHelpError(error: unknown) {
  return (
    error instanceof Error &&
    'code' in error &&
    error.code === 'commander.helpDisplayed'
  );
}
