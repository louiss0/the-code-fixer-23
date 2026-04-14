import {
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  Tree,
  names,
  offsetFromRoot,
  logger,
} from '@nx/devkit';
import * as path from 'path';
import type {
  TestRunner,
  LibraryGeneratorSchema,
  Linter,
  Formatter,
} from './schema.d.ts';
import {
  detectLinterFromRootPackageJson,
  detectTestRunnerFromRootPackageJson,
  detectFormatterFromRootPackageJson,
} from './detect.js';
import { isInteractive, selectOrDefault } from './prompt.js';
import { fileURLToPath } from 'node:url';

const generatorFilesPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'files'
);

export async function libraryGenerator(
  tree: Tree,
  options: LibraryGeneratorSchema
) {
  // Standalone mode: if no directory flag provided, generate files in current directory (files-only)
  // If directory flag is provided, create/use that directory with project name subfolder and register Nx project
  const isStandalone = !options.directory || options.directory === '.';
  const projectRoot = isStandalone
    ? '.'
    : `${options.directory}/${options.name}`;
  const parsedNames = names(options.name);

  const resolvedTestRunner: TestRunner = await resolveTestRunner(
    tree,
    options.testRunner
  );
  const resolvedLinter: Linter = await resolveLinter(tree, options.linter);
  const resolvedFormatter: Formatter = await resolveFormatter(
    tree,
    options.formatter,
    resolvedLinter
  );

  const templateOptions = {
    ...options,
    ...parsedNames,
    offsetFromRoot: offsetFromRoot(projectRoot),
    template: '',
  };

  generateFiles(tree, generatorFilesPath, projectRoot, templateOptions);

  createJsrJson(tree, projectRoot, options);
  createTsConfig(tree, projectRoot, options);
  createPackageJson(
    tree,
    projectRoot,
    options,
    resolvedTestRunner,
    resolvedLinter,
    resolvedFormatter
  );
  createReadme(tree, projectRoot, options, resolvedTestRunner);

  if (resolvedTestRunner === 'vitest') {
    createVitestConfig(tree, projectRoot);
    createExampleTest(tree, projectRoot, 'vitest');
  } else if (resolvedTestRunner === 'jest') {
    createJestConfig(tree, projectRoot);
    createExampleTest(tree, projectRoot, 'jest');
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
  if (!isStandalone) {
    const targets = getProjectTargets(
      projectRoot,
      resolvedTestRunner,
      resolvedLinter,
      resolvedFormatter
    );
    addProjectConfiguration(tree, options.name, {
      root: projectRoot,
      projectType: 'library',
      sourceRoot: `${projectRoot}/src`,
      targets,
    });
  }

  if (!options.skipFormat) {
    await formatFiles(tree);
  }
}

function getProjectTargets(
  projectRoot: string,
  testRunner: TestRunner,
  linter: Linter,
  formatter: Formatter
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

  if (testRunner && testRunner !== 'none') {
    targets.test =
      testRunner === 'vitest'
        ? {
            executor: '@nx/vite:test',
            outputs: ['{projectRoot}/coverage'],
            options: {
              config: `${projectRoot}/vitest.config.ts`,
            },
          }
        : {
            executor: '@nx/jest:jest',
            outputs: ['{projectRoot}/coverage'],
            options: {
              jestConfig: `${projectRoot}/jest.config.ts`,
            },
          };
  }

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
            executor: '@nx/workspace:run-commands',
            options: {
              commands: [`biome lint ${projectRoot}`],
            },
          };
  }

  if (formatter && formatter !== 'none') {
    if (formatter === 'prettier') {
      targets.format = {
        executor: '@nx/workspace:run-commands',
        options: {
          commands: [`prettier --write ${projectRoot}`],
        },
      };
    } else if (formatter === 'biome') {
      targets.format = {
        executor: '@nx/workspace:run-commands',
        options: {
          commands: [`biome format --write ${projectRoot}`],
        },
      };
    } else if (formatter === 'eslint-stylistic') {
      targets.format = {
        executor: '@nx/workspace:run-commands',
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
  testRunner: 'vitest' | 'jest'
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
  options: LibraryGeneratorSchema
) {
  const jsrJson = {
    name: options.importPath,
    version: '0.1.0',
    exports: './src/index.ts',
  };

  tree.write(`${projectRoot}/jsr.json`, JSON.stringify(jsrJson, null, 2));
}

function createTsConfig(
  tree: Tree,
  projectRoot: string,
  options: LibraryGeneratorSchema
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
    JSON.stringify(tsConfigLib, null, 2)
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
  options: LibraryGeneratorSchema,
  testRunner: TestRunner,
  linter: Linter,
  formatter: Formatter
) {
  const devDependencies: Record<string, string> = {};
  const scripts: Record<string, string> = {};

  if (testRunner === 'vitest') {
    devDependencies.vitest = '^2.0.0';
    devDependencies['@vitest/ui'] = '^2.0.0';
    devDependencies['happy-dom'] = '^15.0.0';
    scripts.test = 'vitest run';
  } else if (testRunner === 'jest') {
    devDependencies.jest = '^29.0.0';
    devDependencies['@types/jest'] = '^29.0.0';
    devDependencies['ts-jest'] = '^29.0.0';
    scripts.test = 'jest';
  }

  if (linter === 'eslint') {
    devDependencies.eslint = '^9.9.0';
    devDependencies['@eslint/js'] = '^9.8.0';
  } else if (linter === 'biome') {
    devDependencies['@biomejs/biome'] = '^1.8.3';
  }

  if (formatter === 'prettier') {
    devDependencies.prettier = '^3.0.0';
    scripts.format = 'prettier --write .';
  } else if (formatter === 'biome' && linter !== 'biome') {
    devDependencies['@biomejs/biome'] = '^1.8.3';
    scripts.format = 'biome format --write .';
  } else if (formatter === 'eslint-stylistic') {
    devDependencies['@stylistic/eslint-plugin'] = '^2.0.0';
    devDependencies['eslint-config-prettier'] = '^9.0.0';
    scripts.format = 'eslint --fix .';
  } else if (formatter === 'biome' && linter === 'biome') {
    scripts.format = 'biome format --write .';
  }

  const packageJson: any = {
    name: options.importPath,
    version: '0.1.0',
    description: options.description || '',
    type: 'module',
  };

  if (Object.keys(scripts).length > 0) {
    packageJson.scripts = scripts;
  }

  if (Object.keys(devDependencies).length > 0) {
    packageJson.devDependencies = devDependencies;
  }

  tree.write(
    `${projectRoot}/package.json`,
    JSON.stringify(packageJson, null, 2)
  );
}

function createReadme(
  tree: Tree,
  projectRoot: string,
  options: LibraryGeneratorSchema,
  testRunner: TestRunner
) {
  const testingInfo =
    testRunner !== 'none' ? `**Testing**: ${testRunner}\n\n` : '';

  const testCommand =
    testRunner !== 'none' ? `\n# Run tests\nnpx nx test ${options.name}\n` : '';

  const content = `# ${options.importPath}

${options.description || 'A TypeScript library for JSR'}

${testingInfo}## Installation

\`\`\`sh
# Using JSR
npx jsr add ${options.importPath}
\`\`\`

## Usage

\`\`\`typescript
import { } from '${options.importPath}';
\`\`\`

## Development

\`\`\`sh
# Build the library
npx nx build ${options.name}

# Run type checking
npx nx typecheck ${options.name}${testCommand}
# Validate JSR package (dry-run publish)
npx nx validate ${options.name}
# Publish to JSR
npx nx publish ${options.name}
\`\`\`
`;

  tree.write(`${projectRoot}/README.md`, content);
}

async function resolveTestRunner(
  tree: Tree,
  option?: TestRunner
): Promise<TestRunner> {
  if (option !== undefined) return option;
  const { detected, candidates } = detectTestRunnerFromRootPackageJson(tree);
  if (candidates.length === 2) {
    if (isInteractive()) {
      const choice = (await selectOrDefault(
        'Both Jest and Vitest are detected in the workspace. Choose a test runner:',
        ['jest', 'vitest'],
        'jest'
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
        'eslint'
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
  linter: Linter
): Promise<Formatter> {
  // If biome is the linter, default to biome formatter unless explicitly overridden
  if (linter === 'biome' && option === undefined) {
    return 'biome';
  }

  if (option !== undefined) {
    // Validate: eslint-stylistic requires eslint as linter
    if (option === 'eslint-stylistic' && linter !== 'eslint') {
      logger.warn(
        'ESLint Stylistic requires ESLint as the linter. Falling back to prettier.'
      );
      return 'prettier';
    }
    return option;
  }

  const { candidates } = detectFormatterFromRootPackageJson(tree);

  // Filter out eslint-stylistic if eslint is not the linter
  const validCandidates = candidates.filter(
    (c: Formatter) => c !== 'eslint-stylistic' || linter === 'eslint'
  );

  if (validCandidates.length >= 2) {
    if (isInteractive()) {
      const choice = (await selectOrDefault(
        'Multiple formatters detected. Choose one:',
        validCandidates,
        validCandidates[0]
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
  formatter: Formatter
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
