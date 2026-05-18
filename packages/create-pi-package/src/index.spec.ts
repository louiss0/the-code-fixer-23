import { mkdirSync, writeFileSync } from 'node:fs';
import { vol } from 'memfs';
import {
  createFileCreator,
  Logger,
  handler,
  parseProjectFolders,
  setupRunCli,
} from './index';
import type {
  AllowedFolderChioceValues,
  AllowedPackageManagers,
  AllowedTestRunnerChioces,
  Prompter,
} from './index';

vi.mock('node:fs', async () => {
  const { fs } = await import('memfs');

  return {
    mkdirSync: vi.fn(fs.mkdirSync.bind(fs)),
    writeFileSync: vi.fn((file: string, content: string) => {
      const normalizedFile = file.replaceAll('\\', '/');
      const absoluteFile = normalizedFile.startsWith('/')
        ? normalizedFile
        : `/${normalizedFile}`;
      const directory = absoluteFile.split('/').slice(0, -1).join('/') || '/';

      fs.mkdirSync(directory, { recursive: true });
      fs.writeFileSync(absoluteFile, content);
    }),
  };
});

vi.mock('node:child_process', () => ({
  execFile: vi.fn((_command, _args, optionsOrCallback, callback) => {
    const execFileCallback = callback ?? optionsOrCallback;
    execFileCallback(undefined, '');
  }),
}));

class MockPrompter implements Prompter {
  askForWhatTheyWantToMake(): Promise<AllowedFolderChioceValues> {
    return Promise.resolve([]);
  }

  askForWhichTestRunner(): Promise<AllowedTestRunnerChioces> {
    return Promise.resolve('vitest');
  }

  askForWhichPackageManager(): Promise<AllowedPackageManagers> {
    return Promise.resolve('pnpm');
  }
}

const expectedStarterFiles = {
  extensions: {
    file: 'extensions/index.ts',
    content: 'export default function (pi:ExtensionAPI) {',
  },
  prompts: {
    file: 'prompts/example.md',
    content: 'Summarize the following text.',
  },
  skills: {
    file: 'skills/example/SKILL.md',
    content: '## Purpose',
  },
  themes: {
    file: 'themes/theme.json',
    content: '"$schema":',
  },
} as const;

function expectCreatedStarterFile(choice: keyof typeof expectedStarterFiles) {
  expect(writeFileSync).toBeCalledWith(
    expectedStarterFiles[choice].file,
    expect.stringContaining(expectedStarterFiles[choice].content),
  );
}

describe('parseProjectFolders', () => {
  it('accumulates validated folder choices across parser calls', () => {
    const initialChoices = parseProjectFolders('extensions', undefined);
    const fullChoices = parseProjectFolders('prompts', initialChoices);

    expect(initialChoices).toEqual(['extensions']);
    expect(fullChoices).toEqual(['extensions', 'prompts']);
  });
});

describe('Logger', () => {
  it('wraps Signale methods behind semantic logging methods', () => {
    const signale = {
      start: vi.fn(),
      success: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const logger = new Logger(signale);

    logger.message('Creating files...');
    logger.command('pnpm install');
    logger.warn('Prompting for package manager...');
    logger.error('Install failed');

    expect(signale.success).toBeCalledWith('Creating files...');
    expect(signale.start).toBeCalledWith('Executing command: pnpm install');
    expect(signale.warn).toBeCalledWith('Prompting for package manager...');
    expect(signale.error).toBeCalledWith('Install failed');
  });
});

describe('createFileCreator', () => {
  afterEach(() => {
    vol.reset();
    vi.clearAllMocks();
  });

  it('creates parent directories before writing a file', () => {
    const fileCreator = createFileCreator();

    fileCreator.createFile('prompts/example.md', 'Prompt content');

    expect(mkdirSync).toBeCalledWith('prompts', { recursive: true });
    expect(writeFileSync).toBeCalledWith(
      'prompts/example.md',
      'Prompt content',
    );
  });

  it('creates starter files and scripts for selected PI package folders', () => {
    const fileCreator = createFileCreator();

    fileCreator.createPiFoldersBasedOnChoices(['prompts', 'skills']);
    fileCreator.createScriptsBasedOnChoices(['prompts', 'skills']);

    expectCreatedStarterFile('prompts');
    expectCreatedStarterFile('skills');
    expect(writeFileSync).toBeCalledWith(
      'scripts/create-prompt.ts',
      expect.stringContaining('const fileName = process.argv[2];'),
    );
    expect(writeFileSync).toBeCalledWith(
      'scripts/create-skill.ts',
      expect.stringContaining('writeFileSync(join(directory, "SKILL.md")'),
    );
  });

  it('creates extension tooling files', () => {
    const fileCreator = createFileCreator();

    fileCreator.createTestRunnerConfig('vitest');
    fileCreator.createTsConfig();
    fileCreator.createPackageJson('vitest', ['extensions']);

    expect(writeFileSync).toBeCalledWith(
      'vitest.config.ts',
      expect.stringContaining("import { defineConfig } from 'vitest/config';"),
    );
    expect(writeFileSync).toBeCalledWith(
      'tsconfig.json',
      expect.stringContaining('"include": ['),
    );
    expect(writeFileSync).toBeCalledWith(
      'package.json',
      expect.stringContaining('"vitest": "latest"'),
    );
  });

  it('creates agent instruction files', () => {
    const fileCreator = createFileCreator();

    fileCreator.createAgentInstructions();

    expect(writeFileSync).toBeCalledWith(
      'AGENTS.md',
      expect.stringContaining('coding agents'),
    );
    expect(writeFileSync).toBeCalledWith(
      'CLAUDE.md',
      expect.stringContaining('Claude'),
    );
  });
});

describe('handler', () => {
  const prompter = new MockPrompter();
  const logger = new Logger({
    start: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  });

  beforeEach(() => {
    vi.stubEnv('npm_config_user_agent', '');
    vi.stubEnv('npm_execpath', '');
    vi.stubEnv('npm_lifecycle_script', '');
  });

  afterEach(() => {
    vol.reset();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('asks for folder choices when projectFolders is missing', async () => {
    const fileCreator = createFileCreator();
    const askForWhatTheyWantToMake = vi
      .spyOn(prompter, 'askForWhatTheyWantToMake')
      .mockResolvedValue(['prompts', 'themes']);

    await handler(
      { install: false } as never,
      { fileCreator, logger, prompter },
    );

    expect(askForWhatTheyWantToMake).toBeCalled();
    expectCreatedStarterFile('prompts');
    expectCreatedStarterFile('themes');
  });

  it('creates files inside the provided package directory', async () => {
    const fileCreator = createFileCreator();

    await handler(
      {
        install: false,
        packageName: 'my-pi-package/',
        projectFolders: ['prompts'],
      } as never,
      { fileCreator, logger, prompter },
    );

    expect(writeFileSync).toBeCalledWith(
      expect.stringMatching(/my-pi-package[\\/]prompts[\\/]example\.md/),
      expect.any(String),
    );
    expect(writeFileSync).toBeCalledWith(
      expect.stringMatching(/my-pi-package[\\/]scripts[\\/]create-prompt\.ts/),
      expect.any(String),
    );
  });

  it('creates instructions when requested', async () => {
    const fileCreator = createFileCreator();

    await handler(
      {
        instructions: true,
        install: false,
        projectFolders: ['prompts'],
      } as never,
      { fileCreator, logger, prompter },
    );

    expect(writeFileSync).toBeCalledWith(
      'AGENTS.md',
      expect.stringContaining('coding agents'),
    );
    expect(writeFileSync).toBeCalledWith(
      'CLAUDE.md',
      expect.stringContaining('Claude'),
    );
  });

  it('creates extension tooling and installs with the invoked package manager', async () => {
    vi.stubEnv(
      'npm_config_user_agent',
      'pnpm/10.0.0 npm/? node/v22.0.0 win32 x64',
    );
    const fileCreator = createFileCreator();
    const installPackages = vi.fn();
    const askForWhichTestRunner = vi
      .spyOn(prompter, 'askForWhichTestRunner')
      .mockResolvedValue('jest');
    const command = vi.spyOn(logger, 'command');

    await handler(
      {
        projectFolders: ['extensions'],
      } as never,
      { fileCreator, installPackages, logger, prompter },
    );

    expect(askForWhichTestRunner).toBeCalled();
    expect(writeFileSync).toBeCalledWith(
      'jest.config.cjs',
      expect.stringContaining('ts-jest'),
    );
    expect(command).toBeCalledWith('pnpm install');
    expect(installPackages).toBeCalledWith('pnpm', undefined);
  });

  it('skips installing dependencies when no-install is set', async () => {
    const fileCreator = createFileCreator();
    const installPackages = vi.fn();

    await handler(
      {
        install: false,
        projectFolders: ['extensions'],
        runner: 'vitest',
      } as never,
      { fileCreator, installPackages, logger, prompter },
    );

    expect(installPackages).not.toBeCalled();
  });

  it('warns when test runner selection is cancelled and still creates package files', async () => {
    const fileCreator = createFileCreator();
    const warn = vi.spyOn(logger, 'warn');
    vi.spyOn(prompter, 'askForWhichTestRunner').mockResolvedValue(
      undefined as never,
    );

    await handler(
      {
        install: false,
        projectFolders: ['extensions', 'prompts'],
      } as never,
      { fileCreator, logger, prompter },
    );

    expect(writeFileSync).toBeCalledWith(
      'package.json',
      expect.stringContaining('"create:extension": "tsx scripts/create-extension.ts"'),
    );
    expect(writeFileSync).toBeCalledWith(
      'package.json',
      expect.not.stringContaining('"jest": "latest"'),
    );
    expect(writeFileSync).toBeCalledWith(
      'package.json',
      expect.not.stringContaining('"vitest": "latest"'),
    );
    expect(warn).toBeCalledWith(
      'No test runner selected. PI package starter files were still generated.',
    );
  });

  it('logs install errors before rethrowing them', async () => {
    const error = new Error('Install failed');
    const fileCreator = createFileCreator();
    const installPackages = vi.fn().mockRejectedValue(error);
    const errorSpy = vi.spyOn(logger, 'error');

    await expect(
      handler(
        {
          projectFolders: ['extensions'],
        } as never,
        { fileCreator, installPackages, logger, prompter },
      ),
    ).rejects.toBe(error);

    expect(errorSpy).toBeCalledWith('Failed to install dependencies with npm.');
  });
});

describe('setupRunCli', () => {
  const prompter = new MockPrompter();
  const fileCreator = createFileCreator();
  const installPackages = vi.fn();
  const logger = new Logger({
    start: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  });

  afterEach(() => {
    vol.reset();
    vi.clearAllMocks();
  });

  it('passes parsed CLI options to the handler', async () => {
    const handlerSpy = vi.fn();
    const runCli = setupRunCli(handlerSpy, {
      fileCreator,
      installPackages,
      logger,
      prompter,
    });

    await runCli(
      'my-pi-package/',
      '--project-folders',
      'extensions',
      'prompts',
      '--runner',
      'jest',
      '--instructions',
      '--no-install',
    );

    expect(handlerSpy).toBeCalledWith(
      expect.objectContaining({
        instructions: true,
        install: false,
        packageName: 'my-pi-package/',
        projectFolders: ['extensions', 'prompts'],
        runner: 'jest',
      }),
      expect.objectContaining({ fileCreator, installPackages, logger, prompter }),
    );
  });

  it('accepts project folders without prompting', async () => {
    const runCli = setupRunCli(handler, {
      fileCreator,
      installPackages,
      logger,
      prompter,
    });
    const askForWhatTheyWantToMake = vi.spyOn(
      prompter,
      'askForWhatTheyWantToMake',
    );

    await runCli('--project-folders', 'themes', 'skills', '--no-install');

    expect(askForWhatTheyWantToMake).not.toBeCalled();
    expectCreatedStarterFile('themes');
    expectCreatedStarterFile('skills');
  });
});
