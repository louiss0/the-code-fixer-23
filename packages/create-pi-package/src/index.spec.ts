import { mkdirSync, writeFile } from "node:fs";
import { vol } from "memfs";
import { handler, resolvePackageManager, setupRunCli, FileCreator, Logger } from "./index";
import type {
  AllowedBundlers,
  AllowedFolderChioceValues,
  AllowedPackageManagers,
  AllowedTestRunnerChioces,
  Prompter,
} from "./index";

vi.mock("node:fs", async () => {
  const { fs } = await import("memfs");

  return {
    mkdirSync: vi.fn(fs.mkdirSync.bind(fs)),
    writeFile: vi.fn((file: string, content: string, callback: (error?: Error) => void) => {
      const absoluteFile = file.startsWith("/") ? file : `/${file}`;
      const directory = absoluteFile.split("/").slice(0, -1).join("/") || "/";

      fs.mkdirSync(directory, { recursive: true });
      fs.writeFile(absoluteFile, content, callback);
    }),
  };
});

vi.mock("node:child_process", () => ({
  execFile: vi.fn((_command, _args, optionsOrCallback, callback) => {
    const execFileCallback = callback ?? optionsOrCallback;
    execFileCallback(undefined, "");
  }),
}));

class MockPrompter implements Prompter {
  askForWhatTheyWantToMake(): Promise<AllowedFolderChioceValues> {
    return Promise.resolve([]);
  }

  askForWhichTestRunner(): Promise<AllowedTestRunnerChioces> {
    return Promise.resolve("vitest");
  }

  askForWhichBundler(): Promise<AllowedBundlers> {
    return Promise.resolve("rollup");
  }

  askForWhichPackageManager(): Promise<AllowedPackageManagers> {
    return Promise.resolve("pnpm");
  }
}

function expectWriteFileToWriteBasedOnExpectedValue(chioce: AllowedFolderChioceValues[number]) {
  const chioceToFileAndContentMap: Record<
    AllowedFolderChioceValues[number],
    { file: string; content: string }
  > = {
    extensions: {
      file: "extensions/index.ts",
      content: `export default function (pi:ExtensionAPI) {

      }`,
    },
    prompts: {
      file: "prompts/example.md",
      content: `---
    description:   Summarize text
    argument-hint: "<tone> <word_limit> <text>"
    ---

    Summarize the following text.

    Tone: $1
    Word limit: $2
    Text: $\{@:3}

    Return only the summary.`,
    },
    skills: {
      file: "skills/example/SKILL.md",
      content: `---
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
    - No extra commentary`,
    },
    themes: {
      file: "themes/theme.json",
      content: `{
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
    }`,
    },
  };

  expect(writeFile).toBeCalledWith(
    chioceToFileAndContentMap[chioce].file,
    chioceToFileAndContentMap[chioce].content,
    expect.any(Function),
  );
}

describe("Logger", () => {
  it("wraps Signale methods behind semantic logging methods", () => {
    const signale = {
      start: vi.fn(),
      success: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const logger = new Logger(signale);

    logger.message("Creating files...");
    logger.command("pnpm install");
    logger.warn("Prompting for package manager...");
    logger.error("Install failed");

    expect(signale.success).toBeCalledWith("Creating files...");
    expect(signale.start).toBeCalledWith("Executing command: pnpm install");
    expect(signale.warn).toBeCalledWith("Prompting for package manager...");
    expect(signale.error).toBeCalledWith("Install failed");
  });
});

describe("FileCreator", () => {
  afterEach(() => {
    vol.reset();
    vi.clearAllMocks();
  });

  it("creates parent directories before writing a file", () => {
    const fileCreator = new FileCreator();

    fileCreator.createFile("prompts/example.md", "Prompt content");

    expect(mkdirSync).toBeCalledWith("prompts", { recursive: true });
    expect(writeFile).toBeCalledWith("prompts/example.md", "Prompt content", expect.any(Function));
  });

  it("creates starter files based on selected PI package folders", () => {
    const fileCreator = new FileCreator();

    fileCreator.createPiFoldersBasedOnChoices(["prompts", "skills"]);

    expectWriteFileToWriteBasedOnExpectedValue("prompts");
    expectWriteFileToWriteBasedOnExpectedValue("skills");
  });

  it("creates extension tooling files through file write functions", () => {
    const fileCreator = new FileCreator();

    fileCreator.createTestRunnerConfig("vitest");
    fileCreator.createTsConfig();
    fileCreator.createPackageJson("vite", "vitest", ["extensions"]);

    expect(writeFile).toBeCalledWith("vitest.config.ts", expect.any(String), expect.any(Function));
    expect(writeFile).toBeCalledWith("tsconfig.json", expect.any(String), expect.any(Function));
    expect(writeFile).toBeCalledWith("package.json", expect.any(String), expect.any(Function));
  });
});

describe("package manager detection", () => {
  it("detects installed package managers from the executable path", async () => {
    const prompter = new MockPrompter();
    const findExecutablePath = vi.fn(async (packageManager: string) =>
      packageManager === "pnpm" ? "C:/tools/pnpm.cmd" : undefined,
    );
    const askForWhichPackageManager = vi.spyOn(prompter, "askForWhichPackageManager");

    await expect(resolvePackageManager(prompter, findExecutablePath)).resolves.toBe("pnpm");
    expect(findExecutablePath).toBeCalledWith("bun");
    expect(findExecutablePath).toBeCalledWith("pnpm");
    expect(findExecutablePath).toBeCalledWith("yarn");
    expect(askForWhichPackageManager).not.toBeCalled();
  });

  it("uses npm when no known package manager executable is found", async () => {
    const prompter = new MockPrompter();
    const findExecutablePath = vi.fn(async () => undefined);
    const askForWhichPackageManager = vi.spyOn(prompter, "askForWhichPackageManager");

    await expect(resolvePackageManager(prompter, findExecutablePath)).resolves.toBe("npm");
    expect(askForWhichPackageManager).not.toBeCalled();
  });

  it("asks the user when more than one package manager executable is found", async () => {
    const prompter = new MockPrompter();
    const findExecutablePath = vi.fn(async (packageManager: string) =>
      ["bun", "yarn"].includes(packageManager) ? `C:/tools/${packageManager}.cmd` : undefined,
    );
    const askForWhichPackageManager = vi
      .spyOn(prompter, "askForWhichPackageManager")
      .mockResolvedValue("yarn");

    await expect(resolvePackageManager(prompter, findExecutablePath)).resolves.toBe("yarn");
    expect(askForWhichPackageManager).toBeCalledWith(["bun", "yarn"]);
  });
});

describe("runCli", () => {
  let handlerSpy: Parameters<typeof setupRunCli>[0];
  let runCli: ReturnType<typeof setupRunCli>;
  const prompter = new MockPrompter();
  const fileCreator = new FileCreator();
  const installPackages = vi.fn();
  const logger = new Logger({
    start: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  });

  beforeEach(() => {
    vi.spyOn(fileCreator, "createPiFoldersBasedOnChoices");
    handlerSpy = vi.fn(handler);
    runCli = setupRunCli(handlerSpy, {
      prompter,
      fileCreator,
      installPackages,
      logger,
    });
  });

  afterEach(() => {
    vol.reset();
    vi.clearAllMocks();
  });

  describe("asks the user to choose what they want to make then creates the folder based on the choice", () => {
    const chioceCombosWithoutExtension = [
      ["prompts", "skills"],
      ["prompts"],
      ["skills"],
      ["themes"],
    ] as unknown as Array<AllowedFolderChioceValues>;

    it.for(chioceCombosWithoutExtension)(
      "For %i %i %i %i, prompter and FileCreator are called with the correct values",

      async (values) => {
        const askForWhatTheyWantToMake = vi
          .spyOn(prompter, "askForWhatTheyWantToMake")
          .mockResolvedValue(values);

        await runCli();

        expect(handlerSpy).toBeCalled();
        expect(askForWhatTheyWantToMake).toBeCalled();
        expect(fileCreator.createPiFoldersBasedOnChoices).toBeCalledWith(values);

        values.forEach((value) => {
          expectWriteFileToWriteBasedOnExpectedValue(value);
        });
      },
    );

    const choiceCombosWithExtension = [
      ["extensions", "prompts", "skills", "themes"],
      ["extensions", "skills"],
      ["extensions", "prompts"],
      ["extensions", "themes"],
      ["extensions"],
    ] as unknown as Array<AllowedFolderChioceValues>;

    it.for(choiceCombosWithExtension)(
      "For %i %i %i %i, prompter and FileCreator are called with the correct values",

      async (values) => {
        const askForWhatTheyWantToMake = vi
          .spyOn(prompter, "askForWhatTheyWantToMake")
          .mockResolvedValue(values);

        const askForTestRunner = vi.spyOn(prompter, "askForWhichTestRunner");
        const askForWhichBundler = vi.spyOn(prompter, "askForWhichBundler");

        await runCli();

        expect(handlerSpy).toBeCalled();
        expect(askForWhatTheyWantToMake).toBeCalled();
        expect(askForTestRunner).toBeCalled();
        expect(askForWhichBundler).toBeCalled();

        expect(fileCreator.createPiFoldersBasedOnChoices).toBeCalledWith(values);
        values.forEach((value) => {
          expectWriteFileToWriteBasedOnExpectedValue(value);
        });
      },
    );
  });

  describe("CLI flags", () => {
    it("places generated files in the package name folder when the package name argument is provided", async () => {
      vi.spyOn(prompter, "askForWhatTheyWantToMake").mockResolvedValue(["prompts"]);

      await runCli("my-pi-package");

      expect(writeFile).toBeCalledWith(
        "my-pi-package/prompts/example.md",
        expect.any(String),
        expect.any(Function),
      );
    });

    it("passes all CLI options to the handler", async () => {
      await runCli(
        "my-pi-package",
        "--folder",
        "extensions",
        "--folder",
        "prompts",
        "--runner",
        "jest",
        "--no-install",
      );

      expect(handlerSpy).toBeCalledWith(
        expect.objectContaining({
          args: ["my-pi-package"],
          folder: ["extensions", "prompts"],
          runner: "jest",
          install: false,
        }),
        expect.objectContaining({ prompter, fileCreator, installPackages }),
      );
    });

    it("supports the package name argument without other options", async () => {
      vi.spyOn(prompter, "askForWhatTheyWantToMake").mockResolvedValue(["skills"]);

      await runCli("my-pi-package");

      expect(writeFile).toBeCalledWith(
        "my-pi-package/skills/example/SKILL.md",
        expect.any(String),
        expect.any(Function),
      );
    });

    it("supports the folder option without other options", async () => {
      const askForWhatTheyWantToMake = vi.spyOn(prompter, "askForWhatTheyWantToMake");

      await runCli("--folder", "themes");

      expect(askForWhatTheyWantToMake).not.toBeCalled();
      expect(fileCreator.createPiFoldersBasedOnChoices).toBeCalledWith(["themes"]);
      expectWriteFileToWriteBasedOnExpectedValue("themes");
    });

    it("ignores the runner option without activating extension code when used alone", async () => {
      vi.spyOn(prompter, "askForWhatTheyWantToMake").mockResolvedValue(["prompts"]);
      const askForWhichTestRunner = vi.spyOn(prompter, "askForWhichTestRunner");
      const askForWhichBundler = vi.spyOn(prompter, "askForWhichBundler");
      const createTestRunnerConfig = vi.spyOn(fileCreator, "createTestRunnerConfig");

      await runCli("--runner", "vitest");

      expect(askForWhichTestRunner).not.toBeCalled();
      expect(askForWhichBundler).not.toBeCalled();
      expect(createTestRunnerConfig).not.toBeCalled();
      expectWriteFileToWriteBasedOnExpectedValue("prompts");
    });

    it("ignores the no-install option without activating extension code when used alone", async () => {
      vi.spyOn(prompter, "askForWhatTheyWantToMake").mockResolvedValue(["prompts"]);
      const askForWhichTestRunner = vi.spyOn(prompter, "askForWhichTestRunner");
      const askForWhichBundler = vi.spyOn(prompter, "askForWhichBundler");

      await runCli("--no-install");

      expect(askForWhichTestRunner).not.toBeCalled();
      expect(askForWhichBundler).not.toBeCalled();
      expect(installPackages).not.toBeCalled();
      expectWriteFileToWriteBasedOnExpectedValue("prompts");
    });

    it("passes repeated folder flags to the handler as a folder list", async () => {
      await runCli("--folder", "prompts", "--folder", "skills");

      expect(handlerSpy).toBeCalledWith(
        expect.objectContaining({ folder: ["prompts", "skills"] }),
        expect.objectContaining({ prompter, fileCreator }),
      );
    });

    it("logs the selected folder files created from folder flags", async () => {
      vi.spyOn(logger, "message");

      await handler({ folder: ["prompts", "skills"] }, { prompter, fileCreator, logger });

      expect(logger.message).toBeCalledWith("Creating PI package folders: prompts, skills");
      expect(logger.message).toBeCalledWith("Created PI package starter files.");
    });

    it("creates selected folder files from folder flags without asking for folder choices", async () => {
      const askForWhatTheyWantToMake = vi.spyOn(prompter, "askForWhatTheyWantToMake");

      await handler({ folder: ["prompts", "skills"] }, { prompter, fileCreator, logger });

      expect(askForWhatTheyWantToMake).not.toBeCalled();
      expect(fileCreator.createPiFoldersBasedOnChoices).toBeCalledWith(["prompts", "skills"]);
      expectWriteFileToWriteBasedOnExpectedValue("prompts");
      expectWriteFileToWriteBasedOnExpectedValue("skills");
    });

    it("uses the runner flag when extension files are selected", async () => {
      const askForWhichTestRunner = vi.spyOn(prompter, "askForWhichTestRunner");
      const createTestRunnerConfig = vi.spyOn(fileCreator, "createTestRunnerConfig");

      await handler({ folder: ["extensions"], runner: "jest", install: false }, { prompter, fileCreator, logger });

      expect(askForWhichTestRunner).not.toBeCalled();
      expect(createTestRunnerConfig).toBeCalledWith("jest");
    });

    it("ignores runner and no-install behavior when extension files are not selected", async () => {
      const askForWhichTestRunner = vi.spyOn(prompter, "askForWhichTestRunner");
      const askForWhichBundler = vi.spyOn(prompter, "askForWhichBundler");
      const createTestRunnerConfig = vi.spyOn(fileCreator, "createTestRunnerConfig");
      const createTsConfig = vi.spyOn(fileCreator, "createTsConfig");
      const createPackageJson = vi.spyOn(fileCreator, "createPackageJson");
      const installPackages = vi.fn();

      await handler(
        { folder: ["prompts"], runner: "vitest", install: false },
        { prompter, fileCreator, installPackages, logger },
      );

      expect(askForWhichTestRunner).not.toBeCalled();
      expect(askForWhichBundler).not.toBeCalled();
      expect(createTestRunnerConfig).not.toBeCalled();
      expect(createTsConfig).not.toBeCalled();
      expect(createPackageJson).not.toBeCalled();
      expect(installPackages).not.toBeCalled();
      expect(fileCreator.createPiFoldersBasedOnChoices).toBeCalledWith(["prompts"]);
    });

    it("skips installing packages only after extension tooling would be generated", async () => {
      const installPackages = vi.fn();
      const createTestRunnerConfig = vi.spyOn(fileCreator, "createTestRunnerConfig");

      await handler({ folder: ["extensions"], runner: "vitest", install: false }, { prompter, fileCreator, installPackages, logger });

      expect(createTestRunnerConfig).toBeCalledWith("vitest");
      expect(installPackages).not.toBeCalled();
    });

    it("logs install commands when extension dependencies are installed", async () => {
      const installPackages = vi.fn();
      vi.spyOn(logger, "command");

      await handler({ folder: ["extensions"], runner: "vitest" }, { prompter, fileCreator, installPackages, logger });

      expect(logger.command).toBeCalledWith("npm install");
      expect(installPackages).toBeCalledWith("npm", process.cwd());
    });

    it("logs install errors before rethrowing them", async () => {
      const error = new Error("Install failed");
      const installPackages = vi.fn().mockRejectedValue(error);
      vi.spyOn(logger, "error");

      await expect(
        handler({ folder: ["extensions"], runner: "vitest" }, { prompter, fileCreator, installPackages, logger }),
      ).rejects.toBe(error);

      expect(logger.error).toBeCalledWith("Failed to install dependencies with npm.");
    });

    it("creates selected files and notifies the user when test runner selection is cancelled", async () => {
      const notifyUser = vi.fn();
      vi.spyOn(logger, "warn");
      vi.spyOn(prompter, "askForWhatTheyWantToMake").mockResolvedValue(["extensions", "prompts"]);
      vi.spyOn(prompter, "askForWhichTestRunner").mockResolvedValue(undefined as unknown as AllowedTestRunnerChioces);

      await handler({ install: false }, { prompter, fileCreator, notifyUser, logger });

      expect(fileCreator.createPiFoldersBasedOnChoices).toBeCalledWith(["extensions", "prompts"]);
      expectWriteFileToWriteBasedOnExpectedValue("extensions");
      expectWriteFileToWriteBasedOnExpectedValue("prompts");
      expect(notifyUser).toBeCalledWith(expect.stringContaining("test runner"));
      expect(logger.warn).toBeCalledWith(expect.stringContaining("test runner"));
    });
  });

  describe("User chooses to make extensions and they choose a test runner", () => {
    const testRunnerToConfigFileAndContentMap: Record<
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

    it.for(Object.keys(testRunnerToConfigFileAndContentMap) as Array<AllowedTestRunnerChioces>)(
      "For $i test runner file and content are written",
      async (testRunner) => {
        const askForWhatTheyWantToMake = vi
          .spyOn(prompter, "askForWhatTheyWantToMake")
          .mockResolvedValue(["extensions"]);

        const askForWhichTestRunner = vi
          .spyOn(prompter, "askForWhichTestRunner")
          .mockResolvedValue(testRunner);

        await runCli();

        expect(askForWhatTheyWantToMake).toBeCalled();

        expect(askForWhichTestRunner).toBeCalled();

        expect(writeFile).toBeCalledWith(
          testRunnerToConfigFileAndContentMap[testRunner].file,
          testRunnerToConfigFileAndContentMap[testRunner].content,
          expect.any(Function),
        );

        expect(fileCreator.createPiFoldersBasedOnChoices).toBeCalledWith(["extensions"]);
      },
    );
  });
});
