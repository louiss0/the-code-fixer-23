import { execFile } from "node:child_process";
import { mkdirSync, writeFile } from "node:fs";
import path from "node:path";
import { Command } from "@commander-js/extra-typings";
import inquirer from "inquirer";

const allowedFolderChioces = ["extensions", "prompts", "skills", "themes"] as const;
export type AllowedFolderChioceValues = Array<(typeof allowedFolderChioces)[number]>;

const allowedTestRunnerChioces = ["jest", "vitest"] as const;
export type AllowedTestRunnerChioces = (typeof allowedTestRunnerChioces)[number];

export const allowedBundlers = ["vite", "rollup"] as const;
export type AllowedBundlers = (typeof allowedBundlers)[number];

export const allowedPackageManagers = ["bun", "pnpm", "yarn", "npm"] as const;
export type AllowedPackageManagers = (typeof allowedPackageManagers)[number];
type DetectedPackageManagers = Exclude<AllowedPackageManagers, "npm">;

type FindExecutablePath = (packageManager: DetectedPackageManagers) => Promise<string | undefined>;
type InstallPackages = (packageManager: AllowedPackageManagers, directory: string) => Promise<void>;

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

const fileByFolderChoice: Record<AllowedFolderChioceValues[number], { file: string; content: string }> = {
  extensions: { file: "extensions/index.ts", content: extensionContent },
  prompts: { file: "prompts/example.md", content: promptContent },
  skills: { file: "skills/example/SKILL.md", content: skillContent },
  themes: { file: "themes/theme.json", content: themeContent },
};

const testRunnerConfigByChoice: Record<AllowedTestRunnerChioces, { file: string; content: string }> = {
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

export class Prompter {
  async askForWhatTheyWantToMake(): Promise<AllowedFolderChioceValues> {
    const answers = await inquirer.prompt<{ choices: AllowedFolderChioceValues }>([
      {
        type: "checkbox",
        name: "choices",
        message: "What do you want to include in this PI package?",
        choices: [...allowedFolderChioces],
      },
    ]);

    return answers.choices;
  }

  async askForWhichTestRunner(): Promise<AllowedTestRunnerChioces> {
    const answers = await inquirer.prompt<{ testRunner: AllowedTestRunnerChioces }>([
      {
        type: "list",
        name: "testRunner",
        message: "Which test runner do you want to use?",
        choices: [...allowedTestRunnerChioces],
      },
    ]);

    return answers.testRunner;
  }

  async askForWhichBundler(): Promise<AllowedBundlers> {
    const answers = await inquirer.prompt<{ bundler: AllowedBundlers }>([
      {
        type: "list",
        name: "bundler",
        message: "Which bundler do you want to use?",
        choices: [...allowedBundlers],
      },
    ]);

    return answers.bundler;
  }

  async askForWhichPackageManager(packageManagers: DetectedPackageManagers[]): Promise<AllowedPackageManagers> {
    const answers = await inquirer.prompt<{ packageManager: AllowedPackageManagers }>([
      {
        type: "list",
        name: "packageManager",
        message: "Which package manager do you want to use?",
        choices: packageManagers,
      },
    ]);

    return answers.packageManager;
  }
}

export class FileCreator {
  createPiFoldersBasedOnChoices(choices: AllowedFolderChioceValues) {
    choices.forEach((choice) => {
      const file = fileByFolderChoice[choice];
      this.createFile(file.file, file.content);
    });
  }

  createTestRunnerConfig(testRunner: AllowedTestRunnerChioces) {
    const file = testRunnerConfigByChoice[testRunner];
    this.createFile(file.file, file.content);
  }

  createTsConfig() {
    this.createFile("tsconfig.json", JSON.stringify(createTsConfig(), null, 2));
  }

  createPackageJson(
    bundler: AllowedBundlers,
    testRunner: AllowedTestRunnerChioces,
    choices: AllowedFolderChioceValues,
  ) {
    this.createFile("package.json", JSON.stringify(createPackageJson(bundler, testRunner, choices), null, 2));
  }

  createFile(file: string, content: string) {
    const directory = path.dirname(file);

    if (directory !== ".") mkdirSync(directory, { recursive: true });
    writeFile(file, content, (error) => {
      if (error) throw error;
    });
  }
}

interface Deps {
  prompter: Prompter;
  fileCreator: FileCreator;
  installPackages?: InstallPackages;
}

export async function resolvePackageManager(
  prompter: Pick<Prompter, "askForWhichPackageManager">,
  findExecutablePath: FindExecutablePath = findPackageManagerExecutablePath,
) {
  const detectedPackageManagers: DetectedPackageManagers[] = [];

  for (const packageManager of ["bun", "pnpm", "yarn"] as const) {
    const executablePath = await findExecutablePath(packageManager);
    if (executablePath) detectedPackageManagers.push(packageManager);
  }

  if (detectedPackageManagers.length === 0) return "npm";
  if (detectedPackageManagers.length === 1) return detectedPackageManagers[0];

  return prompter.askForWhichPackageManager(detectedPackageManagers);
}

export async function handler(object: Record<string, string | number | boolean>, deps: Deps) {
  const choices = await deps.prompter.askForWhatTheyWantToMake();
  deps.fileCreator.createPiFoldersBasedOnChoices(choices);

  if (choices.includes("extensions")) {
    const testRunner = await deps.prompter.askForWhichTestRunner();
    const bundler = await deps.prompter.askForWhichBundler();

    deps.fileCreator.createTestRunnerConfig(testRunner);
    deps.fileCreator.createTsConfig();
    deps.fileCreator.createPackageJson(bundler, testRunner, choices);

    if (object.install !== false) {
      const packageManager = await resolvePackageManager(deps.prompter);
      await (deps.installPackages ?? installPackages)(packageManager, process.cwd());
    }
  }
}

export function setupRunCli(
  handler: (object: Record<string, string | number | boolean>, deps: Deps) => Promise<void>,
  deps: Deps,
) {
  return async (...args: string[]) => {
    const program = new Command().option("--no-install", "Skip installing generated package dependencies");
    const flags = args.length > 0 ? program.parse(args, { from: "user" }).opts() : {};
    await handler(flags, deps);
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
  bundler: AllowedBundlers,
  testRunner: AllowedTestRunnerChioces,
  choices: AllowedFolderChioceValues,
) {
  const scripts: Record<string, string> = {
    build: bundler === "vite" ? "vite build" : "rollup -c",
    test: testRunner === "vitest" ? "vitest run" : "jest",
  };

  choices.forEach((choice) => {
    scripts[`create:${choice.slice(0, -1)}`] = `pi create ${choice.slice(0, -1)}`;
  });

  return {
    type: "module",
    scripts,
    devDependencies: {
      typescript: "latest",
      ...(bundler === "vite" ? { vite: "latest" } : { rollup: "latest", "@rollup/plugin-typescript": "latest" }),
      ...(testRunner === "vitest" ? { vitest: "latest" } : { jest: "latest", "ts-jest": "latest" }),
    },
  };
}

async function installPackages(packageManager: AllowedPackageManagers, directory: string) {
  const argsByPackageManager: Record<AllowedPackageManagers, string[]> = {
    bun: ["install"],
    pnpm: ["install"],
    yarn: ["install"],
    npm: ["install"],
  };

  await new Promise<void>((resolve, reject) => {
    execFile(packageManager, argsByPackageManager[packageManager], { cwd: directory }, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function findPackageManagerExecutablePath(packageManager: DetectedPackageManagers) {
  return new Promise<string | undefined>((resolve) => {
    execFile("which", [packageManager], (error, stdout) => {
      if (error) resolve(undefined);
      else resolve(stdout.trim() || undefined);
    });
  });
}

const deps: Deps = {
  prompter: new Prompter(),
  fileCreator: new FileCreator(),
};

if (import.meta.env.PROD) {
  setupRunCli(handler, deps)(...process.argv.slice(2));
}
