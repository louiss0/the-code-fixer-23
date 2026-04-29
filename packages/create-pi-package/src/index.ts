import { Command } from "@commander-js/extra-typings";

const allowedFolderChioces = ["extensions", "prompts", "skills", "themes"] as const;
export type AllowedFolderChioceValues = Array<(typeof allowedFolderChioces)[number]>;

const allowedTestRunnerChioces = ["jest", "vitest"] as const;
export type AllowedTestRunnerChioces = (typeof allowedTestRunnerChioces)[number];

export const allowedBundlers = ["vite", "rollup"] as const;
export type AllowedBundlers = (typeof allowedBundlers)[number];

export interface Prompter {
  askForWhatTheyWantToMake(): Promise<AllowedFolderChioceValues>;
  askForWhichTestRunner(): Promise<AllowedTestRunnerChioces>;
  askForWhichBundler(): Promise<AllowedBundlers>;
}

interface Deps {
  prompter: Prompter;
  createPiFolderBasedOnChioces: (choices: AllowedFolderChioceValues) => void;
}

export async function handler(object: Record<string, string | number | boolean>, deps: Deps) {}
const program = new Command();

export function setupRunCli(
  handler: (object: Record<string, string | number | boolean>, deps: Deps) => Promise<void>,
  deps: Deps,
) {
  return (...args: string[]) => {
    program
      .action(async (flags) => {
        await handler(flags, deps);
      })
      .parse(args);
  };
}

const deps: Deps = {};

if (import.meta.env.PROD) {
  setupRunCli(handler, deps)(...process.argv.slice(2));
}
