import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createCommand } from './command';
import { createPiPackage } from './create-pi-package';

const moduleDirectory = dirname(fileURLToPath(import.meta.url));

export async function runCli(args: string[]) {
  const program = createCommand(async (input) => {
    const result = await createPiPackage(input);

    for (const line of result.summaryLines) {
      console.log(line);
    }
  }, readPackageVersion());

  program.exitOverride();

  try {
    await program.parseAsync(args, { from: 'user' });
    return 0;
  } catch (error) {
    const commanderError = error as { code?: string; exitCode?: number };

    if (commanderError.code === 'commander.helpDisplayed') {
      return 0;
    }

    return commanderError.exitCode ?? 1;
  }
}

function readPackageVersion() {
  try {
    const packageJsonPath = join(moduleDirectory, '../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      version?: string;
    };

    return packageJson.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}
