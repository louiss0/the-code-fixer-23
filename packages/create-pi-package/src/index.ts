import { Command } from 'commander';

export function runCli() {
  const program = new Command();

  program.parse(process.argv);
}

export function shouldRunCli(environment: ImportMetaEnv) {
  return !environment.DEV && environment.MODE !== 'test';
}

if (shouldRunCli(import.meta.env)) {
  runCli();
}
