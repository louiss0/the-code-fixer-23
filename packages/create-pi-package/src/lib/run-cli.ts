import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { createPiPackage } from './create-pi-package.js';
import { isInteractiveSession } from './prompt.js';
import { parseArgs } from './parse-args.js';

export async function runCli(args: string[]) {
  try {
    const { options, showHelp } = parseArgs(args);

    if (showHelp) {
      console.log(getHelpText());
      return 0;
    }

    const targetDirectory = path.resolve(options.directory ?? process.cwd());
    const existingEntries = await readDirectoryEntries(targetDirectory);
    const needsConfirmation = existingEntries.length > 0;

    if (!options.yes && !options.force && needsConfirmation && isInteractiveSession()) {
      console.error(
        'Target directory is not empty. Re-run with --force to overwrite managed files or --yes once the directory is ready.'
      );
      return 1;
    }

    if (!options.yes && !isInteractiveSession()) {
      if (!options.tooling || !options.testRunner || !options.mode) {
        console.error(
          'Missing required options in non-interactive mode. Provide --tooling, --test-runner, and --mode, or use --yes.'
        );
        return 1;
      }
    }

    const result = await createPiPackage(options);

    for (const line of result.summaryLines) {
      console.log(line);
    }

    if (result.skippedFiles.length > 0) {
      return 1;
    }

    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    return 1;
  }
}

async function readDirectoryEntries(targetDirectory: string) {
  try {
    return await readdir(targetDirectory);
  } catch {
    return [];
  }
}

function getHelpText() {
  return `create-pi-package

Usage:
  create-pi-package [directory] [flags]

Flags:
  --directory <path>      Target directory. Defaults to the current working directory.
  --name <name>           Explicit kebab-case package leaf name.
  --tooling <preset>      Tooling preset: eslint-prettier | biome
  --test-runner <runner>  Test runner: vitest | jest
  --mode <mode>           Package mode: source | bundle
  --yes                   Accept recommended defaults for omitted choices.
  --force                 Overwrite managed scaffold files.
  --help, -h              Show help.
`;
}
