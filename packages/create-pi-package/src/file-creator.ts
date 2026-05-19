import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { AllowedFolderChioceValues, AllowedTestRunnerChioces } from "./options";

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
  { file: string; folder: `${string}/`; content: string }
> = {
  extensions: { file: "index.ts", folder: "extensions/", content: extensionContent },
  prompts: { file: "example.md", folder: "prompts/", content: promptContent },
  skills: { file: "SKILL.md", folder: "skills/example/", content: skillContent },
  themes: { file: "theme.json", folder: "themes/", content: themeContent },
};

const scriptByFolderChoice: Record<
  AllowedFolderChioceValues[number],
  { file: string; folder: `${string}/`; content: string }
> = {
  extensions: {
    file: "create-extension.ts",
    folder: "scripts/",
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
    folder: "scripts/",
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
    file: "create-skill.ts",
    folder: "scripts/",
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
    file: "create-theme.ts",
    folder: "scripts/",
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

export interface FileCreator {
  createPiFoldersBasedOnChoices(choices: AllowedFolderChioceValues): void;
  createScriptsBasedOnChoices(choices: AllowedFolderChioceValues): void;
  createAgentInstructions(): void;
  createTestRunnerConfig(testRunner: AllowedTestRunnerChioces): void;
  createTsConfig(): void;
  createPackageJson(
    testRunner: AllowedTestRunnerChioces | undefined,
    choices: AllowedFolderChioceValues,
  ): void;
  createFile(file: string, content: string): void;
}

class DefaultFileCreator implements FileCreator {
  constructor(private readonly directory = "") {}

  createPiFoldersBasedOnChoices(choices: AllowedFolderChioceValues) {
    choices.forEach((choice) => {
      const file = fileByFolderChoice[choice];
      this.createFile(file.file, file.content, file.folder);
    });
  }

  createScriptsBasedOnChoices(choices: AllowedFolderChioceValues) {
    choices.forEach((choice) => {
      const file = scriptByFolderChoice[choice];
      this.createFile(file.file, file.content, file.folder);
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

  createFile(file: string, content: string, folder?: `${string}/`) {
    const generatedFolderPath = folder ? `${this.directory}/${folder}` : this.directory;
    const targetFile = generatedFolderPath ? join(generatedFolderPath, file) : file;

    mkdirSync(dirname(targetFile), { recursive: true });
    writeFileSync(targetFile, content);
  }
}

export function createFileCreator(directory = ""): FileCreator {
  return new DefaultFileCreator(directory);
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
