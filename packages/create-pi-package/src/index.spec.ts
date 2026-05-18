import { mkdirSync, writeFileSync } from "node:fs";

import {
  hasCreatedFile,
  listCreatedFiles,
  readCreatedFile,
  resetCreatedFiles,
} from "./file-creator.mock";
import { createFileCreator, Logger, handler, setupRunCli } from "./index";
import type {
  AllowedFolderChioceValues,
  AllowedPackageManagers,
  AllowedTestRunnerChioces,
  Prompter,
} from "./index";

vi.mock("node:fs", async () => {
  const { fs } = await import("memfs");
  const path = await import("node:path");

  return {
    mkdirSync: vi.fn(fs.mkdirSync.bind(fs)),
    writeFileSync: vi.fn((file: string, content: string) => {
      const directory = path.dirname(file);

      fs.mkdirSync(directory, { recursive: true });
      fs.writeFileSync(file, content);
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

  askForWhichPackageManager(): Promise<AllowedPackageManagers> {
    return Promise.resolve("pnpm");
  }
}

const expectedStarterFiles = {
  extensions: {
    file: "extensions/index.ts",
    content: "export default function (pi:ExtensionAPI) {",
  },
  prompts: {
    file: "prompts/example.md",
    content: "Summarize the following text.",
  },
  skills: {
    file: "skills/example/SKILL.md",
    content: "## Purpose",
  },
  themes: {
    file: "themes/theme.json",
    content: '"$schema":',
  },
} as const;

function expectCreatedStarterFile(
  choice: keyof typeof expectedStarterFiles,
  directory = "",
) {
  const file = directory ? `${directory}/${expectedStarterFiles[choice].file}` : expectedStarterFiles[choice].file;

  expect(hasCreatedFile(file)).toBe(true);
  expect(readCreatedFile(file)).toContain(expectedStarterFiles[choice].content);
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

describe("createFileCreator", () => {
  afterEach(() => {
    resetCreatedFiles();
    vi.clearAllMocks();
  });

  it("creates parent directories before writing a file", () => {
    const fileCreator = createFileCreator();

    fileCreator.createFile("prompts/example.md", "Prompt content");

    expect(mkdirSync).toBeCalledWith("prompts", { recursive: true });
    expect(writeFileSync).toBeCalledWith("prompts/example.md", "Prompt content");
    expect(readCreatedFile("prompts/example.md")).toBe("Prompt content");
  });

  it("creates starter files and scripts for selected PI package folders", () => {
    const fileCreator = createFileCreator();

    fileCreator.createPiFoldersBasedOnChoices(["prompts", "skills"]);
    fileCreator.createScriptsBasedOnChoices(["prompts", "skills"]);

    expectCreatedStarterFile("prompts");
    expectCreatedStarterFile("skills");
    expect(readCreatedFile("scripts/create-prompt.ts")).toContain(
      "const fileName = process.argv[2];",
    );
    expect(readCreatedFile("scripts/create-skill.ts")).toContain(
      'writeFileSync(join(directory, "SKILL.md")',
    );
  });

  it("creates extension tooling files", () => {
    const fileCreator = createFileCreator();

    fileCreator.createTestRunnerConfig("vitest");
    fileCreator.createTsConfig();
    fileCreator.createPackageJson("vitest", ["extensions"]);

    expect(readCreatedFile("vitest.config.ts")).toContain(
      "import { defineConfig } from 'vitest/config';",
    );
    expect(readCreatedFile("tsconfig.json")).toContain('"include": [');
    expect(readCreatedFile("package.json")).toContain('"vitest": "latest"');
  });

  it("creates agent instruction files", () => {
    const fileCreator = createFileCreator();

    fileCreator.createAgentInstructions();

    expect(readCreatedFile("AGENTS.md")).toContain("coding agents");
    expect(readCreatedFile("CLAUDE.md")).toContain("Claude");
  });

  it("prefixes created files when a package directory is provided", () => {
    const fileCreator = createFileCreator("my-pi-package");

    fileCreator.createFile("prompts/example.md", "Prompt content");

    expect(mkdirSync).toBeCalledWith(expect.stringMatching(/my-pi-package[\\/]prompts/), {
      recursive: true,
    });
    expect(writeFileSync).toBeCalledWith(
      expect.stringMatching(/my-pi-package[\\/]prompts[\\/]example\.md/),
      "Prompt content",
    );
    expect(readCreatedFile("my-pi-package/prompts/example.md")).toBe("Prompt content");
  });
});

describe("handler", () => {
  const prompter = new MockPrompter();
  const logger = new Logger({
    start: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  });

  beforeEach(() => {
    vi.stubEnv("npm_config_user_agent", "");
    vi.stubEnv("npm_execpath", "");
    vi.stubEnv("npm_lifecycle_script", "");
  });

  afterEach(() => {
    resetCreatedFiles();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("asks for folder choices when projectFolders is missing", async () => {
    const askForWhatTheyWantToMake = vi
      .spyOn(prompter, "askForWhatTheyWantToMake")
      .mockResolvedValue(["prompts", "themes"]);

    await handler({ install: false } as never, {
      fileCreator: createFileCreator(),
      installPackages: vi.fn(),
      logger,
      prompter,
    });

    expect(askForWhatTheyWantToMake).toBeCalled();
    expectCreatedStarterFile("prompts");
    expectCreatedStarterFile("themes");
  });

  it("creates files inside the provided package directory", async () => {
    await handler(
      {
        install: false,
        packageName: "my-pi-package/",
        projectFolders: ["prompts"],
      } as never,
      {
        fileCreator: createFileCreator(),
        installPackages: vi.fn(),
        logger,
        prompter,
      },
    );

    expectCreatedStarterFile("prompts", "my-pi-package");
    expect(hasCreatedFile("my-pi-package/scripts/create-prompt.ts")).toBe(true);
  });

  it("creates instructions when requested", async () => {
    await handler(
      {
        instructions: true,
        install: false,
        projectFolders: ["prompts"],
      } as never,
      {
        fileCreator: createFileCreator(),
        installPackages: vi.fn(),
        logger,
        prompter,
      },
    );

    expect(readCreatedFile("AGENTS.md")).toContain("coding agents");
    expect(readCreatedFile("CLAUDE.md")).toContain("Claude");
  });

  it("creates extension tooling and installs with the invoked package manager", async () => {
    vi.stubEnv("npm_config_user_agent", "pnpm/10.0.0 npm/? node/v22.0.0 win32 x64");
    const installPackages = vi.fn();
    const askForWhichTestRunner = vi
      .spyOn(prompter, "askForWhichTestRunner")
      .mockResolvedValue("jest");
    const command = vi.spyOn(logger, "command");

    await handler(
      {
        projectFolders: ["extensions"],
      } as never,
      {
        fileCreator: createFileCreator(),
        installPackages,
        logger,
        prompter,
      },
    );

    expect(askForWhichTestRunner).toBeCalled();
    expect(readCreatedFile("jest.config.cjs")).toContain("ts-jest");
    expect(command).toBeCalledWith("pnpm install");
    expect(installPackages).toBeCalledWith("pnpm", undefined);
  });

  it("skips installing dependencies when no-install is set", async () => {
    const installPackages = vi.fn();

    await handler(
      {
        install: false,
        projectFolders: ["extensions"],
        runner: "vitest",
      } as never,
      {
        fileCreator: createFileCreator(),
        installPackages,
        logger,
        prompter,
      },
    );

    expect(installPackages).not.toBeCalled();
  });

  it("warns when test runner selection is cancelled and still creates package files", async () => {
    const warn = vi.spyOn(logger, "warn");
    vi.spyOn(prompter, "askForWhichTestRunner").mockResolvedValue(undefined as never);

    await handler(
      {
        install: false,
        projectFolders: ["extensions", "prompts"],
      } as never,
      {
        fileCreator: createFileCreator(),
        installPackages: vi.fn(),
        logger,
        prompter,
      },
    );

    expect(readCreatedFile("package.json")).toContain(
      '"create:extension": "tsx scripts/create-extension.ts"',
    );
    expect(readCreatedFile("package.json")).not.toContain('"jest": "latest"');
    expect(readCreatedFile("package.json")).not.toContain('"vitest": "latest"');
    expect(warn).toBeCalledWith(
      "No test runner selected. PI package starter files were still generated.",
    );
  });

  it("logs install errors before rethrowing them", async () => {
    const error = new Error("Install failed");
    const installPackages = vi.fn().mockRejectedValue(error);
    const errorSpy = vi.spyOn(logger, "error");

    await expect(
      handler(
        {
          projectFolders: ["extensions"],
        } as never,
        {
          fileCreator: createFileCreator(),
          installPackages,
          logger,
          prompter,
        },
      ),
    ).rejects.toBe(error);

    expect(errorSpy).toBeCalledWith("Failed to install dependencies with npm.");
  });
});

describe("setupRunCli", () => {
  const prompter = new MockPrompter();
  const logger = new Logger({
    start: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  });

  afterEach(() => {
    resetCreatedFiles();
    vi.clearAllMocks();
  });

  it("passes parsed CLI options to the handler", async () => {
    const fileCreator = createFileCreator();
    const installPackages = vi.fn();
    const handlerSpy = vi.fn();
    const runCli = setupRunCli(handlerSpy, {
      fileCreator,
      installPackages,
      logger,
      prompter,
    });

    await runCli(
      "my-pi-package/",
      "--project-folders",
      "extensions",
      "prompts",
      "--runner",
      "jest",
      "--instructions",
      "--no-install",
    );

    expect(handlerSpy).toBeCalledWith(
      expect.objectContaining({
        instructions: true,
        install: false,
        packageName: "my-pi-package/",
        projectFolders: ["extensions", "prompts"],
        runner: "jest",
      }),
      expect.objectContaining({
        fileCreator,
        installPackages,
        logger,
        prompter,
      }),
    );
  });

  it("accepts project folders without prompting", async () => {
    const runCli = setupRunCli(handler, {
      fileCreator: createFileCreator(),
      installPackages: vi.fn(),
      logger,
      prompter,
    });
    const askForWhatTheyWantToMake = vi.spyOn(prompter, "askForWhatTheyWantToMake");

    await runCli("--project-folders", "themes", "skills", "--no-install");

    expect(askForWhatTheyWantToMake).not.toBeCalled();
    expectCreatedStarterFile("themes");
    expectCreatedStarterFile("skills");
  });

  it("keeps the mocked filesystem isolated between tests", () => {
    expect(listCreatedFiles()).toEqual({});
  });
});
