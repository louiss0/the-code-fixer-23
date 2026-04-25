import path from 'node:path';

import type {
  CreatePiPackageOptions,
  PiPackageMode,
  TestRunner,
  ToolingPreset,
} from './types.js';

const validTooling = new Set(['eslint-prettier', 'biome']);
const validTestRunners = new Set(['vitest', 'jest']);
const validModes = new Set(['source', 'bundle']);

export function parseArgs(args: string[]) {
  const options: CreatePiPackageOptions = {};
  let showHelp = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === '--help' || argument === '-h') {
      showHelp = true;
      continue;
    }

    if (argument === '--yes') {
      options.yes = true;
      continue;
    }

    if (argument === '--force') {
      options.force = true;
      continue;
    }

    if (argument === '--directory') {
      options.directory = requireNextValue(args, index, argument);
      index += 1;
      continue;
    }

    if (argument === '--name') {
      options.name = requireNextValue(args, index, argument);
      index += 1;
      continue;
    }

    if (argument === '--tooling') {
      const tooling = requireNextValue(args, index, argument);

      if (!validTooling.has(tooling)) {
        throw new Error(`Unsupported tooling preset: ${tooling}`);
      }

      options.tooling = tooling as ToolingPreset;
      index += 1;
      continue;
    }

    if (argument === '--test-runner') {
      const testRunner = requireNextValue(args, index, argument);

      if (!validTestRunners.has(testRunner)) {
        throw new Error(`Unsupported test runner: ${testRunner}`);
      }

      options.testRunner = testRunner as TestRunner;
      index += 1;
      continue;
    }

    if (argument === '--mode') {
      const mode = requireNextValue(args, index, argument);

      if (!validModes.has(mode)) {
        throw new Error(`Unsupported mode: ${mode}`);
      }

      options.mode = mode as PiPackageMode;
      index += 1;
      continue;
    }

    if (argument.startsWith('-')) {
      throw new Error(`Unknown flag: ${argument}`);
    }

    options.directory = path.resolve(argument);
  }

  return { options, showHelp };
}

function requireNextValue(args: string[], index: number, flag: string) {
  const value = args[index + 1];

  if (!value || value.startsWith('-')) {
    throw new Error(`Missing value for ${flag}`);
  }

  return value;
}
