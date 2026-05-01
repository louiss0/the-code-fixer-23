import { fileURLToPath } from 'node:url';
import * as path from 'path';
import {
  type Tree,
  addDependenciesToPackageJson,
  addProjectConfiguration,
  detectPackageManager,
  formatFiles,
  generateFiles,
  getPackageManagerCommand,
  installPackagesTask,
  logger,
  names,
  offsetFromRoot,
  runTasksInSerial,
} from '@nx/devkit';
import { configurationGenerator as jestConfigurationGenerator } from '@nx/jest';
import { vitestGenerator } from '@nx/vite';
import type {
  Formatter,
  LibraryGeneratorSchema,
  Linter,
  TestRunner,
} from './schema.d.ts';

type DetectedTestRunner = 'jest' | 'vitest';
type DetectedLinter = 'eslint' | 'biome';
type DetectedFormatter = 'prettier' | 'biome' | 'eslint-stylistic';

const generatorFilesPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'files',
);

interface NormalizedLibraryGeneratorSchema extends LibraryGeneratorSchema {
  importPath: string;
}

function readRootPackageJson(tree: Tree): Record<string, unknown> | null {
  try {
    const raw = tree.read('package.json', 'utf-8');
    if (!raw) return null;
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function hasDep(pkg: Record<string, unknown>, name: string): boolean {
  const deps = (pkg?.dependencies as Record<string, string>) ?? {};
  const devDeps = (pkg?.devDependencies as Record<string, string>) ?? {};
  return Boolean(deps[name] || devDeps[name]);
}

function detectTestRunnerFromRootPackageJson(tree: Tree): {
  detected: DetectedTestRunner | null;
  candidates: DetectedTestRunner[];
} {
  const pkg = readRootPackageJson(tree) ?? {};
  const candidates: DetectedTestRunner[] = [];
  if (hasDep(pkg, 'jest')) candidates.push('jest');
  if (hasDep(pkg, 'vitest')) candidates.push('vitest');

  if (candidates.length === 1) {
    return { detected: candidates[0], candidates };
  }
  return { detected: null, candidates };
}

function detectLinterFromRootPackageJson(tree: Tree): {
  detected: DetectedLinter | null;
  candidates: DetectedLinter[];
} {
  const pkg = readRootPackageJson(tree) ?? {};
  const candidates: DetectedLinter[] = [];
  if (hasDep(pkg, 'eslint')) candidates.push('eslint');
  if (hasDep(pkg, '@biomejs/biome')) candidates.push('biome');

  if (candidates.length === 1) {
    return { detected: candidates[0], candidates };
  }
  return { detected: null, candidates };
}

function detectFormatterFromRootPackageJson(tree: Tree): {
  detected: DetectedFormatter | null;
  candidates: DetectedFormatter[];
} {
  const pkg = readRootPackageJson(tree) ?? {};
  const candidates: DetectedFormatter[] = [];
  if (hasDep(pkg, 'prettier')) candidates.push('prettier');
  if (hasDep(pkg, '@biomejs/biome')) candidates.push('biome');
  if (hasDep(pkg, '@stylistic/eslint-plugin'))
    candidates.push('eslint-stylistic');

  if (candidates.length === 1) {
    return { detected: candidates[0], candidates };
  }
  return { detected: null, candidates };
}

function isInteractive(): boolean {
  const nxInteractive = process.env.NX_INTERACTIVE;
  if (nxInteractive === 'true') return true;
  if (nxInteractive === 'false') return false;

  const isCi = /^1|true$/i.test(String(process.env.CI ?? ''));
  const tty =
    typeof process.stdout !== 'undefined' && process.stdout.isTTY === true;
  return !isCi && tty;
}

async function selectOrDefault(
  question: string,
  choices: string[],
  defaultChoice: string,
): Promise<string> {
  if (!isInteractive()) return defaultChoice;

  try {
    const mod = (await import('enquirer')) as {
      Select?: new (options: unknown) => { run: () => Promise<string> };
      prompt?: (options: unknown) => Promise<{ choice?: string }>;
      default?: {
        Select?: new (options: unknown) => { run: () => Promise<string> };
      };
    };
    const Select = mod.Select ?? mod.default?.Select;

    if (Select) {
      const prompt = new Select({ name: 'choice', message: question, choices });
      const answer = await prompt.run();
      return typeof answer === 'string' ? answer : defaultChoice;
    }

    if (typeof mod.prompt === 'function') {
      const res = await mod.prompt({
        type: 'select',
        name: 'choice',
        message: question,
        choices,
      });
      return res?.choice ?? defaultChoice;
    }
  } catch {
    // Fall back to the default in non-interactive or minimal installs.
  }

  return defaultChoice;
}

function normalizeOptions(
  options: LibraryGeneratorSchema,
): NormalizedLibraryGeneratorSchema {
  if (options.importPath) {
    return { ...options, importPath: options.importPath };
  }

  if (!options.scope) {
    throw new Error('scope is required when importPath is not provided');
  }

  return {
    ...options,
    importPath: `@${options.scope}/${names(options.name).fileName}`,
  };
}

export async function libraryGenerator(
  tree: Tree,
  options: LibraryGeneratorSchema,
) {
  const resolvedOptions = normalizeOptions(options);

  // Standalone mode: if no directory flag provided, generate files in current directory (files-only)
  // If directory flag is provided, create/use that directory with project name subfolder and register Nx project
  const isStandalone =
    !resolvedOptions.directory || resolvedOptions.directory === '.';
  const projectRoot = isStandalone
    ? '.'
    : `${resolvedOptions.directory}/${resolvedOptions.name}`;
  const parsedNames = names(resolvedOptions.name);

  const resolvedTestRunner: TestRunner = await resolveTestRunner(
    tree,
    options.testRunner,
  );
  const resolvedLinter: Linter = await resolveLinter(tree, options.linter);
  const resolvedFormatter: Formatter = await resolveFormatter(
    tree,
    options.formatter,
    resolvedLinter,
  );

  const packageManager = detectPackageManager(tree.root);
  const packageManagerCommands = getPackageManagerCommand(packageManager);

  const templateOptions = {
    ...resolvedOptions,
    ...parsedNames,
    offsetFromRoot: offsetFromRoot(projectRoot),
    template: '',
  };

  generateFiles(tree, generatorFilesPath, projectRoot, templateOptions);

  createJsrJson(tree, projectRoot, resolvedOptions);
  createTsConfig(tree, projectRoot, resolvedOptions);
  const devDependencies = getDevDependencies(
    resolvedTestRunner,
    resolvedLinter,
    resolvedFormatter,
  );

  createPackageJson(
    tree,
    projectRoot,
    resolvedOptions,
    isStandalone,
    devDependencies,
  );
  createReadme(
    tree,
    projectRoot,
    resolvedOptions,
    resolvedTestRunner,
    packageManagerCommands.exec,
  );

  if (isStandalone) {
    if (resolvedTestRunner === 'vitest') {
      createVitestConfig(tree, projectRoot);
      createExampleTest(tree, projectRoot, 'vitest');
    } else if (resolvedTestRunner === 'jest') {
      createJestConfig(tree, projectRoot);
      createExampleTest(tree, projectRoot, 'jest');
    }
  }

  if (resolvedLinter === 'eslint') {
    createEslintConfig(tree, projectRoot, resolvedFormatter);
  } else if (resolvedLinter === 'biome') {
    createBiomeConfig(tree, projectRoot);
  }

  // Create formatter configs
  if (resolvedFormatter === 'prettier') {
    createPrettierConfig(tree, projectRoot);
  }

  // Only register an Nx project when generating into a subdirectory (monorepo mode)
  let installTask = () => {};

  if (!isStandalone) {
    const targets = getProjectTargets(
      projectRoot,
      resolvedTestRunner,
      resolvedLinter,
      resolvedFormatter,
    );
    addProjectConfiguration(tree, options.name, {
      root: projectRoot,
      projectType: 'library',
      sourceRoot: `${projectRoot}/src`,
      targets,
    });

    installTask = await configureIntegratedTestRunner(
      tree,
      resolvedOptions.name,
      resolvedTestRunner,
      resolvedOptions.skipFormat,
    );

    addDependenciesToPackageJson(tree, {}, devDependencies);
  }

  if (!resolvedOptions.skipFormat) {
    await formatFiles(tree);
  }

  if (!isStandalone && !resolvedOptions.skipInstall) {
    installPackagesTask(tree, true, undefined, packageManager);
  }

  if (isStandalone || resolvedOptions.skipInstall) {
    return () => {};
  }

  return runTasksInSerial(installTask);
}

async function configureIntegratedTestRunner(
  tree: Tree,
  projectName: string,
  testRunner: TestRunner,
  skipFormat = false,
) {
  if (testRunner === 'vitest') {
    return vitestGenerator(
      tree,
      {
        project: projectName,
        uiFramework: 'none',
        coverageProvider: 'v8',
        testEnvironment: 'happy-dom',
        skipFormat,
      },
      false,
      true,
    );
  }

  if (testRunner === 'jest') {
    return jestConfigurationGenerator(tree, {
      project: projectName,
      testEnvironment: 'node',
      compiler: 'tsc',
      skipPackageJson: true,
      skipFormat,
    });
  }

  return () => {};
}

function getProjectTargets(
  projectRoot: string,
  testRunner: TestRunner,
  linter: Linter,
  formatter: Formatter,
) {
  const targets: any = {
    build: {
      executor: '@nx/js:tsc',
      outputs: ['{options.outputPath}'],
      options: {
        outputPath: `dist/${projectRoot}`,
        main: `${projectRoot}/src/index.ts`,
        tsConfig: `${projectRoot}/tsconfig.lib.json`,
        assets: [`${projectRoot}/*.md`, `${projectRoot}/jsr.json`],
      },
    },
    typecheck: {
      executor: '@nx/js:tsc',
      outputs: ['{options.outputPath}'],
      options: {
        outputPath: `dist/${projectRoot}`,
        main: `${projectRoot}/src/index.ts`,
        tsConfig: `${projectRoot}/tsconfig.lib.json`,
        noEmit: true,
      },
    },
    publish: {
      executor: '@code-fixer-23/nx-jsr:publish',
      options: {
        packageRoot: projectRoot,
      },
    },
    version: {
      executor: '@code-fixer-23/nx-jsr:version',
      options: {
        packageRoot: projectRoot,
      },
    },
    validate: {
      executor: '@code-fixer-23/nx-jsr:validate',
      options: {
        packageRoot: projectRoot,
      },
    },
  };

  if (linter && linter !== 'none') {
    targets.lint =
      linter === 'eslint'
        ? {
            executor: '@nx/eslint:lint',
            options: {
              lintFilePatterns: [`${projectRoot}/**/*.ts`],
            },
          }
        : {
            executor: 'nx:run-commands',
            options: {
              commands: [`biome lint ${projectRoot}`],
            },
          };
  }

  if (formatter && formatter !== 'none') {
    if (formatter === 'prettier') {
      targets.format = {
        executor: 'nx:run-commands',
        options: {
          commands: [`prettier --write ${projectRoot}`],
        },
      };
    } else if (formatter === 'biome') {
      targets.format = {
        executor: 'nx:run-commands',
        options: {
          commands: [`biome format --write ${projectRoot}`],
        },
      };
    } else if (formatter === 'eslint-stylistic') {
      targets.format = {
        executor: 'nx:run-commands',
        options: {
          commands: [`eslint --fix ${projectRoot}/**/*.ts`],
        },
      };
    }
  }

  return targets;
}

function createVitestConfig(tree: Tree, projectRoot: string) {
  const content = `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
`;

  tree.write(`${projectRoot}/vitest.config.ts`, content);
}

function createJestConfig(tree: Tree, projectRoot: string) {
  const isRootLevel = !projectRoot.includes('/');
  const relativeToRoot = isRootLevel ? '.' : '../..';

  const content = `export default {
  displayName: '${projectRoot}',
  preset: '${relativeToRoot}/jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '${relativeToRoot}/coverage/${projectRoot}',
};
`;

  tree.write(`${projectRoot}/jest.config.ts`, content);
}

function createExampleTest(
  tree: Tree,
  projectRoot: string,
  testRunner: 'vitest' | 'jest',
) {
  const content =
    testRunner === 'vitest'
      ? `import { describe, it, expect } from 'vitest';

describe('example', () => {
  it('should pass', () => {
    expect(true).toBe(true);
  });
});
`
      : `describe('example', () => {
  it('should pass', () => {
    expect(true).toBe(true);
  });
});
`;

  tree.write(`${projectRoot}/src/__tests__/index.test.ts`, content);
}

function createJsrJson(
  tree: Tree,
  projectRoot: string,
  options: NormalizedLibraryGeneratorSchema,
) {
  const jsrJson = {
    $schema: 'https://jsr.io/schema/config-file.v1.json',
    name: options.importPath,
    version: '0.1.0',
    exports: './src/index.ts',
    publish: {
      include: ['LICENSE.txt', 'README.md', 'src/**/*'],
      exclude: ['src/**/*.test.ts'],
    },
  };

  tree.write(`${projectRoot}/jsr.json`, JSON.stringify(jsrJson, null, 2));
}

function createTsConfig(
  tree: Tree,
  projectRoot: string,
  options: NormalizedLibraryGeneratorSchema,
) {
  // Determine if project is at root level
  const isRootLevel = !projectRoot.includes('/');
  const relativeToRoot = isRootLevel ? '.' : '../..';

  const tsConfigLib = {
    extends: `${relativeToRoot}/tsconfig.base.json`,
    compilerOptions: {
      outDir: `${relativeToRoot}/dist/out-tsc`,
      declaration: true,
      types: [],
    },
    include: ['src/**/*.ts'],
    exclude: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
  };

  tree.write(
    `${projectRoot}/tsconfig.lib.json`,
    JSON.stringify(tsConfigLib, null, 2),
  );

  const tsConfig = {
    extends: `${relativeToRoot}/tsconfig.json`,
    files: [],
    references: [
      {
        path: './tsconfig.lib.json',
      },
    ],
  };

  tree.write(`${projectRoot}/tsconfig.json`, JSON.stringify(tsConfig, null, 2));
}

function createPackageJson(
  tree: Tree,
  projectRoot: string,
  options: NormalizedLibraryGeneratorSchema,
  isStandalone: boolean,
  devDependencies: Record<string, string>,
) {
  const packageJson: {
    name: string;
    version: string;
    description: string;
    type: 'module';
    devDependencies?: Record<string, string>;
  } = {
    name: options.importPath,
    version: '0.1.0',
    description: options.description || '',
    type: 'module',
  };

  if (isStandalone && Object.keys(devDependencies).length > 0) {
    packageJson.devDependencies = devDependencies;
  }

  tree.write(
    `${projectRoot}/package.json`,
    JSON.stringify(packageJson, null, 2),
  );
}

function getDevDependencies(
  testRunner: TestRunner,
  linter: Linter,
  formatter: Formatter,
): Record<string, string> {
  const devDependencies: Record<string, string> = {
    '@nx/js': '*',
    '@nx/vitest': '*',
    '@types/node': '*',
    jsr: '*',
    typescript: '*',
  };

  if (testRunner === 'vitest') {
    devDependencies.vitest = '*';
    devDependencies['@vitest/ui'] = '*';
    devDependencies['happy-dom'] = '*';
  } else if (testRunner === 'jest') {
    devDependencies.jest = '*';
    devDependencies['@types/jest'] = '*';
    devDependencies['ts-jest'] = '*';
  }

  if (linter === 'eslint') {
    devDependencies.eslint = '*';
    devDependencies['@eslint/js'] = '*';
  } else if (linter === 'biome') {
    devDependencies['@biomejs/biome'] = '*';
  }

  if (formatter === 'prettier') {
    devDependencies.prettier = '*';
  } else if (formatter === 'biome') {
    devDependencies['@biomejs/biome'] = '*';
  } else if (formatter === 'eslint-stylistic') {
    devDependencies['@stylistic/eslint-plugin'] = '*';
    devDependencies['eslint-config-prettier'] = '*';
  }

  return devDependencies;
}

function createReadme(
  tree: Tree,
  projectRoot: string,
  options: NormalizedLibraryGeneratorSchema,
  testRunner: TestRunner,
  execCommand: string,
) {
  const testingInfo =
    testRunner !== 'none' ? `**Testing**: ${testRunner}\n\n` : '';

  const testCommand =
    testRunner !== 'none'
      ? `\n# Run tests\n${execCommand} nx test ${options.name}\n`
      : '';

  const content = `# ${options.importPath}

${options.description || 'A TypeScript library for JSR'}

${testingInfo}## Installation

\`\`\`sh
# Using JSR
${execCommand} jsr add ${options.importPath}
\`\`\`

## Usage

\`\`\`typescript
import { } from '${options.importPath}';
\`\`\`

## Development

\`\`\`sh
# Build the library
${execCommand} nx build ${options.name}

# Run type checking
${execCommand} nx typecheck ${options.name}${testCommand}
# Validate JSR package (dry-run publish)
${execCommand} nx validate ${options.name}
# Publish to JSR
${execCommand} nx publish ${options.name}
\`\`\`
`;

  tree.write(`${projectRoot}/README.md`, content);
}

async function resolveTestRunner(
  tree: Tree,
  option?: TestRunner,
): Promise<TestRunner> {
  if (option !== undefined) return option;
  const { detected, candidates } = detectTestRunnerFromRootPackageJson(tree);
  if (candidates.length === 2) {
    if (isInteractive()) {
      const choice = (await selectOrDefault(
        'Both Jest and Vitest are detected in the workspace. Choose a test runner:',
        ['jest', 'vitest'],
        'jest',
      )) as TestRunner;
      return choice;
    }
    return 'jest';
  }
  if (detected) return detected as TestRunner;
  return 'vitest';
}

async function resolveLinter(tree: Tree, option?: Linter): Promise<Linter> {
  if (option !== undefined) return option;
  const { detected, candidates } = detectLinterFromRootPackageJson(tree);
  if (candidates.length === 2) {
    if (isInteractive()) {
      const choice = (await selectOrDefault(
        'Both ESLint and Biome are detected in the workspace. Choose a linter:',
        ['eslint', 'biome'],
        'eslint',
      )) as Linter;
      return choice;
    }
    return 'eslint';
  }
  if (detected) return detected as Linter;
  return 'eslint';
}

async function resolveFormatter(
  tree: Tree,
  option: Formatter | undefined,
  linter: Linter,
): Promise<Formatter> {
  // If biome is the linter, default to biome formatter unless explicitly overridden
  if (linter === 'biome' && option === undefined) {
    return 'biome';
  }

  if (option !== undefined) {
    // Validate: eslint-stylistic requires eslint as linter
    if (option === 'eslint-stylistic' && linter !== 'eslint') {
      logger.warn(
        'ESLint Stylistic requires ESLint as the linter. Falling back to prettier.',
      );
      return 'prettier';
    }
    return option;
  }

  const { candidates } = detectFormatterFromRootPackageJson(tree);

  // Filter out eslint-stylistic if eslint is not the linter
  const validCandidates = candidates.filter(
    (c: Formatter) => c !== 'eslint-stylistic' || linter === 'eslint',
  );

  if (validCandidates.length >= 2) {
    if (isInteractive()) {
      const choice = (await selectOrDefault(
        'Multiple formatters detected. Choose one:',
        validCandidates,
        validCandidates[0],
      )) as Formatter;
      return choice;
    }
    return validCandidates[0];
  }

  if (validCandidates.length === 1) {
    return validCandidates[0];
  }

  // Default: prettier for eslint, none for others
  return linter === 'eslint' ? 'prettier' : 'none';
}

function createEslintConfig(
  tree: Tree,
  projectRoot: string,
  formatter: Formatter,
) {
  let content: string;

  if (formatter === 'eslint-stylistic') {
    content = `import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import prettier from 'eslint-config-prettier';

export default [
  eslint.configs.recommended,
  {
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      '@stylistic/indent': ['error', 2],
      '@stylistic/quotes': ['error', 'single'],
      '@stylistic/semi': ['error', 'always'],
    },
  },
  prettier,
];
`;
  } else {
    content = `import eslint from '@eslint/js';

export default [eslint.configs.recommended];
`;
  }

  tree.write(`${projectRoot}/eslint.config.mjs`, content);
}

function createPrettierConfig(tree: Tree, projectRoot: string) {
  const content = `{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80,
  "arrowParens": "always"
}
`;

  tree.write(`${projectRoot}/.prettierrc.json`, content);

  const ignoreContent = `node_modules
dist
coverage
`;

  tree.write(`${projectRoot}/.prettierignore`, ignoreContent);
}

function createBiomeConfig(tree: Tree, projectRoot: string) {
  const content = `{
  "$schema": "https://biomejs.dev/schemas/1.8.3/schema.json",
  "formatter": { "enabled": true },
  "linter": { "enabled": true }
}
`;

  tree.write(`${projectRoot}/biome.json`, content);
}

export default libraryGenerator;
