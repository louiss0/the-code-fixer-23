import { execFile } from "node:child_process";
import { resolve } from "node:path";

import { Command } from "@commander-js/extra-typings";
import { checkbox, select } from "@inquirer/prompts";
import signaleLogger from "signale";
import { optional, parse, pipe, regex, string } from "valibot";

import { createFileCreator, type FileCreator } from "./file-creator";
import {
  allowedFolderChioces,
  allowedTestRunnerChioces,
  folderChoicesSchema,
  runnerChiocesSchema,
} from "./options";
import type {
  AllowedFolderChioceValues,
  AllowedPackageManagers,
  AllowedTestRunnerChioces,
} from "./options";

export { createFileCreator } from "./file-creator";
export type { FileCreator } from "./file-creator";
export {
  allowedFolderChioces,
  allowedPackageManagers,
  allowedTestRunnerChioces,
} from "./options";
export type {
  AllowedFolderChioceValues,
  AllowedPackageManagers,
  AllowedTestRunnerChioces,
} from "./options";

const folderPathSchema = optional(
  pipe(
    string(),
    regex(
      /(?:[\w\s]+\/)+/,
      "A folder path must be a sequence of folder names separated by slashes and end with a slash",
    ),
  ),
);

type SignaleLogger = Pick<typeof signaleLogger, "start" | "success" | "warn" | "error">;

export class Logger {
  constructor(private readonly signale: SignaleLogger = signaleLogger) {}

  message(message: string) {
    this.signale.success(message);
  }

  command(command: string) {
    this.signale.start(`Executing command: ${command}`);
  }

  warn(message: string) {
    this.signale.warn(message);
  }

  error(message: string) {
    this.signale.error(message);
  }
}

export class Prompter {
  async askForWhatTheyWantToMake(): Promise<AllowedFolderChioceValues> {
    const answer = await checkbox({
      message: "What do you want to include in this PI package?",
      choices: allowedFolderChioces.map((choice) => ({ value: choice, name: choice })),
    });

    return answer;
  }

  async askForWhichTestRunner(): Promise<AllowedTestRunnerChioces> {
    const answer = await select({
      message: "Which test runner do you want to use?",
      choices: allowedTestRunnerChioces.map((choice) => ({ value: choice, name: choice })),
    });

    return answer;
  }

  async askForWhichPackageManager(
    packageManagers: AllowedPackageManagers[],
  ): Promise<AllowedPackageManagers> {
    const answer = await select({
      message: "Which package manager do you want to use?",
      choices: packageManagers.map((manager) => ({ value: manager, name: manager })),
    });

    return answer;
  }
}

interface Deps {
  prompter: Prompter;
  createFileCreator: (directory?: string) => FileCreator;
  installPackages: (
    packageManager: AllowedPackageManagers,
    directory?: string,
  ) => Promise<void>;
  logger: Logger;
}


export function detectInvokedPackageManager(
  commandSignal = [
    process.env.npm_config_user_agent,
    process.env.npm_execpath,
    process.env.npm_lifecycle_script,
  ].find(Boolean),
): AllowedPackageManagers | undefined {
  const command = commandSignal?.toLowerCase();

  if (!command) return undefined;
  if (command.includes("pnpm")) return "pnpm";
  if (command.includes("yarn")) return "yarn";
  if (command.includes("bun")) return "bun";
  if (command.includes("npm")) return "npm";

  return undefined;
}

export async function resolvePackageManager(
  _prompter: Pick<Prompter, "askForWhichPackageManager">,
) {
  return detectInvokedPackageManager() ?? "npm";
}

const program = new Command()
  .argument("[packageFolder]", "Package folder to create", (value) => {
    return parse(folderPathSchema, value);
  })
  .option(
    "--project-folders <project-folders...>",
    "PI package folders to create",
    (value: string, previous: AllowedFolderChioceValues | string | undefined) => {
      const choices = Array.isArray(previous)
        ? previous
        : previous
          ? [parse(folderChoicesSchema, previous)]
          : [];

      return [...choices, parse(folderChoicesSchema, value)] as AllowedFolderChioceValues;
    },
  )
  .option("--runner <runner>", "Test runner to use when extensions are selected", (value) => {
    return parse(runnerChiocesSchema, value);
  })
  .option("--instructions", "Generate AGENTS.md and CLAUDE.md files")
  .option("--no-install", "Skip installing generated package dependencies");

interface HandlerOptions {
  install?: boolean;
  instructions?: boolean;
  packageFolder?: string;
  projectFolders?: AllowedFolderChioceValues;
  runner?: AllowedTestRunnerChioces;
}

export async function handler(object: HandlerOptions, deps: Deps) {
  const { logger, prompter } = deps;
  if (!object.projectFolders) logger.warn("Asking which PI package folders to create.");

  const choices: AllowedFolderChioceValues =
    object.projectFolders ?? (await prompter.askForWhatTheyWantToMake());

  const fileCreator = deps.createFileCreator(object.packageFolder);

  logger.message(`Creating PI package folders: ${choices.join(", ")}`);
  fileCreator.createPiFoldersBasedOnChoices(choices);
  fileCreator.createScriptsBasedOnChoices(choices);
  logger.message("Created PI package starter files.");

  if (object.instructions === true) {
    logger.message("Creating agent instruction files.");
    fileCreator.createAgentInstructions();
  }

  if (choices.includes("extensions")) {
    if (!object.runner) logger.warn("Asking which test runner to use for extension tooling.");

    const testRunner = object.runner ?? (await prompter.askForWhichTestRunner());

    if (!testRunner) {
      logger.warn("No test runner selected. PI package starter files were still generated.");
    }

    logger.message(`Creating extension tooling${testRunner ? ` with ${testRunner}` : ""}.`);
    if (testRunner) fileCreator.createTestRunnerConfig(testRunner);
    fileCreator.createTsConfig();
    fileCreator.createPackageJson(testRunner, choices);

    if (object.install !== false) {
      const packageManager = await resolvePackageManager(prompter);

      try {
        const [command, args] = getInstallCommand(packageManager);
        logger.command(`${command} ${args.join(" ")}`);
        await deps.installPackages(packageManager, object.packageFolder);
      } catch (error) {
        logger.error(`Failed to install dependencies with ${packageManager}.`);
        throw error;
      }
    }
  }
}

export function setupRunCli(
  handler: (object: HandlerOptions, deps: Deps) => Promise<void>,
  deps: Deps,
) {
  return async (...args: string[]) => {
    const parsedProgram = program.parse(args, { from: "user" });
    const flags = parsedProgram.opts();
    const packageFolder = parsedProgram.args[0];

    await handler({ ...flags, packageFolder }, deps);
  };
}

function getInstallCommand(packageManager: AllowedPackageManagers) {
  if (packageManager === "pnpm") {
    return [packageManager, ["install", "--ignore-workspace", "--config.strictDepBuilds=false"]] as const;
  }

  return [packageManager, ["install"]] as const;
}

async function runCommand(command: string, args: readonly string[], cwd: string) {
  await new Promise<void>((resolve, reject) => {
    execFile(command, args, { cwd }, (error, stdout, stderr) => {
      if (!error) {
        resolve();
        return;
      }

      const message = `${stdout}\n${stderr}`.trim();
      reject(message ? new Error(message, { cause: error }) : error);
    });
  });
}

export async function installPackages(
  packageManager: AllowedPackageManagers,
  directory?: string,
) {
  const rootDir = process.cwd();
  const cwd = directory ? resolve(rootDir, directory) : rootDir;
  const [command, args] = getInstallCommand(packageManager);

  console.log(`Installing dependencies in ${cwd} (root: ${rootDir})`);
  await runCommand(command, args, cwd);
}

const deps: Deps = {
  prompter: new Prompter(),
  createFileCreator,
  logger: new Logger(),
  installPackages,
};

if (!import.meta.env.DEV) {
  setupRunCli(handler, deps)(...process.argv.slice(2));
}
