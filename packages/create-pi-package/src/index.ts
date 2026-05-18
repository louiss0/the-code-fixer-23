import { execFile } from "node:child_process";
import { join } from "node:path";

import { Command } from "@commander-js/extra-typings";
import { checkbox, select } from "@inquirer/prompts";
import signaleLogger from "signale";
import { optional, parse, pipe, regex, string } from "valibot";

import { createFileCreator, type FileCreator } from "./file-creator";
import {
  allowedFolderChioces,
  allowedTestRunnerChioces,
  folderChoicesSchema,
  packageManagerChiocesSchema,
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

function resolvePackageDirectory(packageName: string | undefined) {
  return packageName === "." ? process.cwd() : packageName;
}

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
    const answers = await checkbox({
      message: "What do you want to include in this PI package?",
      choices: allowedFolderChioces.map((choice) => ({ value: choice, name: choice })),
    });

    return answers;
  }

  async askForWhichTestRunner(): Promise<AllowedTestRunnerChioces> {
    const answers = await select({
      message: "Which test runner do you want to use?",
      choices: allowedTestRunnerChioces.map((choice) => ({ value: choice, name: choice })),
    });

    return answers;
  }

  async askForWhichPackageManager(
    packageManagers: AllowedPackageManagers[],
  ): Promise<AllowedPackageManagers> {
    const answers = await select({
      message: "Which package manager do you want to use?",
      choices: packageManagers.map((manager) => ({ value: manager, name: manager })),
    });

    return parse(packageManagerChiocesSchema, answers);
  }
}

interface Deps {
  prompter: Prompter;
  fileCreator: FileCreator;
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
  .argument("[packageName]", "Package folder to create", (value) => {
    if (value === ".") return process.cwd();
    return parse(folderPathSchema, value);
  })
  .option(
    "--project-folders <project-folders...>",
    "PI package folders to create",
    (value: string, previous: AllowedFolderChioceValues) => {
      // Commander calls variadic option parsers once per option-argument and passes the
      // previous parsed result back in, so we accumulate the validated folder choices
      // until the final call returns the complete project folder list.
      return previous.concat(parse(folderChoicesSchema, value));
    },
    [],
  )
  .option("--runner <runner>", "Test runner to use when extensions are selected", (value) => {
    return parse(runnerChiocesSchema, value);
  })
  .option("--instructions", "Generate AGENTS.md and CLAUDE.md files")
  .option("--no-install", "Skip installing generated package dependencies");

type HandlerOptions = ReturnType<typeof program.opts> & {
  packageName: (typeof program.args)[0];
};

export async function handler(object: HandlerOptions, deps: Deps) {
  const { logger, prompter } = deps;

  if (!object.projectFolders) logger.warn("Asking which PI package folders to create.");

  const packageDirectory = resolvePackageDirectory(object.packageName);
  const choices = object.projectFolders ?? (await prompter.askForWhatTheyWantToMake());
  const fileCreator = packageDirectory ? createFileCreator(packageDirectory) : deps.fileCreator;

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
      logger.command(`${packageManager} install`);

      try {
        await deps.installPackages(packageManager, packageDirectory);
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
    const parsedProgram = args.length > 0 ? program.parse(args, { from: "user" }) : program;
    const flags = parsedProgram.opts() as HandlerOptions;
    const packageName = resolvePackageDirectory(parsedProgram.args[0]);

    await handler({ ...flags, packageName } as HandlerOptions, deps);
  };
}

async function installPackages(packageManager: AllowedPackageManagers, directory?: string) {
  const cwd = directory ? join(process.cwd(), directory) : process.cwd();

  await new Promise<void>((resolve, reject) => {
    execFile(packageManager, ["install"], { cwd }, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

const deps: Deps = {
  prompter: new Prompter(),
  fileCreator: createFileCreator(),
  logger: new Logger(),
  installPackages,
};

if (import.meta.env.PROD) {
  setupRunCli(handler, deps)(...process.argv.slice(2));
}
