import { execFile } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path, { join } from "node:path";
import { Command } from "@commander-js/extra-typings";
import { checkbox, select } from "@inquirer/prompts";
import signaleLogger from "signale";
import { array, optional, parse, picklist, pipe, regex, string, transform } from "valibot";

const folderChoicesSchema = picklist(["extensions", "prompts", "skills", "themes"]);
const allowedFolderChioces = folderChoicesSchema.options;
export type AllowedFolderChioceValues = Array<(typeof allowedFolderChioces)[number]>;

const runnerChiocesSchema = picklist(["jest", "vitest"]);
const allowedTestRunnerChioces = runnerChiocesSchema.options;
export type AllowedTestRunnerChioces = (typeof allowedTestRunnerChioces)[number];

const packageManagerChiocesSchema = picklist(["bun", "pnpm", "yarn", "npm"]);
export const allowedPackageManagers = packageManagerChiocesSchema.options;
export type AllowedPackageManagers = (typeof allowedPackageManagers)[number];

const folderPathSchema = optional(
  pipe(
    string(),
    regex(
      /(?:[\w\s]+\/)+/,
      "A folder path must be a sequence of folder names separated by slashes and end with a slash",
    ),
  ),
);

type InstallPackages = (
  packageManager: AllowedPackageManagers,
  directory?: string,
) => Promise<void>;
type SignaleLogger = Pick<typeof signaleLogger, "start" | "success" | "warn" | "error">;

const extensionContent = `export default function (pi:ExtensionAPI) {

      }`;

const promptContent = `---
    description:   Summarize text
    argument-hint: "<tone> <word_limit> <text>"
    ---

    Summarize the following text.

    Tone: $1
    Word limit: $2
    Text: $\{@:3}

    Return only the summary.`;

const skillContent = `---
    name: summarize-text
    description: Summarize user-provided text into a concise paragraph. Use when the user asks to summarize, condense, or extract key ideas from text.
    license: MIT
    ---

    # Summarize Text

    ## Purpose

    Condense input text into a clear, short summary while preserving key ideas.

    ## When to Use

    - User asks to "summarize", "shorten", or "condense" text
    - Large blocks of text need quick understanding

    ## Instructions

    1. Read the full input text carefully.
    2. Identify the main ideas and supporting points.
    3. Remove redundancy and minor details.
    4. Produce a concise summary (default ≤ 100 words unless specified).
    5. Match tone if the user provides one.

    ## Output

    - A single paragraph summary
    - No extra commentary`;

const themeContent = `{
      "$schema": "https://raw.githubusercontent.com/badlogic/pi-mono/main/packages/coding-agent/src/modes/interactive/theme/theme-schema.json",
      "name": "my-theme",
      "vars": {
        "primary": "#00aaff",
        "secondary": 242
      },
      "colors": {
        "accent": "primary",
        "border": "primary",
        "borderAccent": "#00ffff",
        "borderMuted": "secondary",
        "success": "#00ff00",
        "error": "#ff0000",
        "warning": "#ffff00",
        "muted": "secondary",
        "dim": 240,
        "text": "",
        "thinkingText": "secondary",
        "selectedBg": "#2d2d30",
        "userMessageBg": "#2d2d30",
        "userMessageText": "",
        "customMessageBg": "#2d2d30",
        "customMessageText": "",
        "customMessageLabel": "primary",
        "toolPendingBg": "#1e1e2e",
        "toolSuccessBg": "#1e2e1e",
        "toolErrorBg": "#2e1e1e",
        "toolTitle": "primary",
        "toolOutput": "",
        "mdHeading": "#ffaa00",
        "mdLink": "primary",
        "mdLinkUrl": "secondary",
        "mdCode": "#00ffff",
        "mdCodeBlock": "",
        "mdCodeBlockBorder": "secondary",
        "mdQuote": "secondary",
        "mdQuoteBorder": "secondary",
        "mdHr": "secondary",
        "mdListBullet": "#00ffff",
        "toolDiffAdded": "#00ff00",
        "toolDiffRemoved": "#ff0000",
        "toolDiffContext": "secondary",
        "syntaxComment": "secondary",
        "syntaxKeyword": "primary",
        "syntaxFunction": "#00aaff",
        "syntaxVariable": "#ffaa00",
        "syntaxString": "#00ff00",
        "syntaxNumber": "#ff00ff",
        "syntaxType": "#00aaff",
        "syntaxOperator": "primary",
        "syntaxPunctuation": "secondary",
        "thinkingOff": "secondary",
        "thinkingMinimal": "primary",
        "thinkingLow": "#00aaff",
        "thinkingMedium": "#00ffff",
        "thinkingHigh": "#ff00ff",
        "thinkingXhigh": "#ff0000",
        "bashMode": "#ffaa00"
      }
    }`;

const agentsContent = `# AGENTS.md

Use this file to document repository-specific instructions for coding agents.
`;

const claudeContent = `# CLAUDE.md

Use this file to document repository-specific instructions for Claude.
`;

const fileByFolderChoice: Record<
  AllowedFolderChioceValues[number],
  { file: string; content: string }
> = {
  extensions: { file: "extensions/index.ts", content: extensionContent },
  prompts: { file: "prompts/example.md", content: promptContent },
  skills: { file: "skills/example/SKILL.md", content: skillContent },
  themes: { file: "themes/theme.json", content: themeContent },
};

const scriptByFolderChoice: Record<
  AllowedFolderChioceValues[number],
  { file: string; content: string }
> = {
  extensions: {
    file: "scripts/create-extension.ts",
    content: `import { dirname, join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

const extensionPath = process.argv[2];

if (!extensionPath) {
  throw new Error("Provide an extension path. Example: pnpm create:extension auth/index.ts");
}

const file = join("extensions", extensionPath);

mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, ${JSON.stringify(extensionContent)});
`,
  },
  prompts: {
    file: "scripts/create-prompt.ts",
    content: `import { join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

const fileName = process.argv[2];

if (!fileName) {
  throw new Error("Provide a prompt file name. Example: pnpm create:prompt summarize.md");
}

mkdirSync("prompts", { recursive: true });
writeFileSync(join("prompts", fileName), ${JSON.stringify(promptContent)});
`,
  },
  skills: {
    file: "scripts/create-skill.ts",
    content: `import { join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

const skillName = process.argv[2];

if (!skillName) {
  throw new Error("Provide a skill name. Example: pnpm create:skill summarize-text");
}

const directory = join("skills", skillName);

mkdirSync(directory, { recursive: true });
writeFileSync(join(directory, "SKILL.md"), ${JSON.stringify(skillContent)});
`,
  },
  themes: {
    file: "scripts/create-theme.ts",
    content: `import { join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

const fileName = process.argv[2];

if (!fileName) {
  throw new Error("Provide a theme file name. Example: pnpm create:theme theme.json");
}

mkdirSync("themes", { recursive: true });
writeFileSync(join("themes", fileName), ${JSON.stringify(themeContent)});
`,
  },
};

const testRunnerConfigByChoice: Record<
  AllowedTestRunnerChioces,
  { file: string; content: string }
> = {
  vitest: {
    file: "vitest.config.ts",
    content: `// vitest.config.ts
        import { defineConfig } from 'vitest/config';

        export default defineConfig({
          test: {
            environment: 'node',
            include: ['src/**/*.test.ts'],
            coverage: {
              provider: 'v8',
              reporter: ['text', 'html']
            }
          }
        });`,
  },
  jest: {
    file: "jest.config.cjs",
    content: `/** @type {import('jest').Config} */
        module.exports = {
          testEnvironment: 'node',

          extensionsToTreatAsEsm: ['.ts'],

          transform: {
            '^.+\\.ts$': [
              'ts-jest',
              {
                useESM: true,
                tsconfig: './tsconfig.spec.json'
              }
            ]
          },

          moduleNameMapper: {
            '^(\\.{1,2}/.*)\\.js$': '$1'
            },

          testMatch: ['**/*.test.ts']
          };`,
  },
};

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

    return answers;
  }
}

export class FileCreator {
  constructor(private readonly directory = "") {}

  createPiFoldersBasedOnChoices(choices: AllowedFolderChioceValues) {
    choices.forEach((choice) => {
      const file = fileByFolderChoice[choice];
      this.createFile(file.file, file.content);
    });
  }

  createScriptsBasedOnChoices(choices: AllowedFolderChioceValues) {
    choices.forEach((choice) => {
      const file = scriptByFolderChoice[choice];
      this.createFile(file.file, file.content);
    });
  }

  createAgentInstructions() {
    this.createFile("AGENTS.md", agentsContent);
    this.createFile("CLAUDE.md", claudeContent);
  }

  createTestRunnerConfig(testRunner: AllowedTestRunnerChioces) {
    const file = testRunnerConfigByChoice[testRunner];
    this.createFile(file.file, file.content);
  }

  createTsConfig() {
    this.createFile("tsconfig.json", JSON.stringify(createTsConfig(), null, 2));
  }

  createPackageJson(
    testRunner: AllowedTestRunnerChioces | undefined,
    choices: AllowedFolderChioceValues,
  ) {
    this.createFile(
      "package.json",
      JSON.stringify(createPackageJson(testRunner, choices), null, 2),
    );
  }

  createFile(file: string, content: string) {
    const targetFile = this.directory ? join(this.directory, file) : file;
    const directory = path.dirname(targetFile);
    if (directory !== ".") mkdirSync(directory, { recursive: true });
    writeFileSync(targetFile, content);
  }
}

interface Deps {
  prompter: Prompter;
  fileCreator: FileCreator;
  installPackages: InstallPackages;
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
    return parse(folderPathSchema, value);
  })
  .option("--project-folders <project-folders...>", "PI package folders to create", (value) => {
    return parse(
      pipe(
        string(),
        regex(
          new RegExp(`(?:${allowedFolderChioces.join("|")})+(?:,|\\s+))+`),
          `must be a comma-separated or space-separated list of these names: ${allowedFolderChioces.join(", ")}`,
        ),
        transform((value) => parse(array(folderChoicesSchema), value.split(/[,\s]+/))),
      ),
      value,
    );
  })
  .option("--runner <runner>", "Test runner to use when extensions are selected", (value) => {
    return parse(runnerChiocesSchema, value);
  })
  .option("--instructions", "Generate AGENTS.md and CLAUDE.md files")
  .option("--no-install", "Skip installing generated package dependencies");

type HandlerOptions = ReturnType<typeof program.opts> & {
  packageName: (typeof program.args)[0];
};

export async function handler(object: HandlerOptions, deps: Deps) {
  const logger = deps.logger;

  if (!object.projectFolders) logger.warn("Asking which PI package folders to create.");

  const choices = object.projectFolders ?? (await deps.prompter.askForWhatTheyWantToMake());
  const fileCreator = object.packageName
    ? new FileCreator(object.packageName)
    : deps.fileCreator;

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

    const testRunner = await deps.prompter.askForWhichTestRunner();

    if (!testRunner) {
      const message = "No test runner selected. PI package starter files were still generated.";
      logger.warn(message);
    }

    logger.message(`Creating extension tooling${testRunner ? ` with ${testRunner}` : ""}.`);
    if (testRunner) fileCreator.createTestRunnerConfig(testRunner);
    fileCreator.createTsConfig();
    fileCreator.createPackageJson(testRunner, choices);

    if (object.install !== false) {
      const packageManager = await resolvePackageManager(deps.prompter);
      logger.command(`${packageManager} install`);

      try {
        await deps.installPackages(packageManager, object.packageName);
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
    const packageName = parsedProgram.args[0];

    await handler({ ...flags, packageName }, deps);
  };
}

function createTsConfig() {
  return {
    compilerOptions: {
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "Bundler",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      declaration: true,
      outDir: "dist",
    },
    include: ["extensions/**/*.ts"],
  };
}

function createPackageJson(
  testRunner: AllowedTestRunnerChioces | undefined,
  choices: AllowedFolderChioceValues,
) {
  const scripts: Record<string, string> = {};

  choices.forEach((choice) => {
    scripts[`create:${choice.slice(0, -1)}`] = `tsx scripts/create-${choice.slice(0, -1)}.ts`;
  });

  if (testRunner) scripts.test = testRunner === "vitest" ? "vitest run" : "jest";

  return {
    type: "module",
    scripts,
    devDependencies: {
      typescript: "latest",
      tsx: "latest",
      ...(testRunner === "vitest" ? { vitest: "latest" } : {}),
      ...(testRunner === "jest" ? { jest: "latest", "ts-jest": "latest" } : {}),
    },
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
  fileCreator: new FileCreator(),
  logger: new Logger(),
  installPackages,
};

if (import.meta.env.PROD) {
  setupRunCli(handler, deps)(...process.argv.slice(2));
}
