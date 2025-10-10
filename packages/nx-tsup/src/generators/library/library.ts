import {
  Tree,
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  joinPathFragments,
  names,
  offsetFromRoot,
  logger,
} from '@nx/devkit';
import type { LibraryGeneratorSchema, TestRunner, Linter, Formatter } from './schema.d.ts';
import {
  detectLinterFromRootPackageJson,
  detectTestRunnerFromRootPackageJson,
  detectFormatterFromRootPackageJson,
} from './detect.js';
import { isInteractive, selectOrDefault } from './prompt.js';
import { join } from 'node:path';

export async function libraryGenerator(
  tree: Tree,
  options: LibraryGeneratorSchema
) {
  const name = names(options.name).fileName;
  const dir = options.directory ?? 'packages';
  const projectRoot = joinPathFragments(dir, name);
  const sourceRoot = joinPathFragments(projectRoot, 'src');

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

  const projectTargets = getProjectTargets(
    projectRoot,
    resolvedTestRunner,
    resolvedLinter,
    resolvedFormatter
  );

  addProjectConfiguration(tree, name, {
    root: projectRoot,
    projectType: 'library',
    sourceRoot,
    targets: projectTargets,
    tags: [],
  });

  // Templates
  generateFiles(tree, join(__dirname, 'files'), projectRoot, {
    ...options,
    description: options.description || 'A TypeScript library built with Tsup.',
    tmpl: '',
    name,
    offsetFromRoot: offsetFromRoot(projectRoot),
    testRunner: resolvedTestRunner,
    linter: resolvedLinter,
    formatter: resolvedFormatter,
  });

  createTsConfig(tree, projectRoot);
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
    createExampleTest(tree, projectRoot, resolvedTestRunner);
  } else if (resolvedTestRunner === 'jest') {
    createJestConfig(tree, projectRoot);
    createExampleTest(tree, projectRoot, resolvedTestRunner);
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

  if (!options.skipFormat) {
    await formatFiles(tree);
  }

  logger.info(`Created ${name} at ${projectRoot}`);
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
  return 'jest';
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

  const { detected, candidates } = detectFormatterFromRootPackageJson(tree);
  
  // Filter out eslint-stylistic if eslint is not the linter
  const validCandidates = candidates.filter(
    (c) => c !== 'eslint-stylistic' || linter === 'eslint'
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

function getProjectTargets(
  projectRoot: string,
  testRunner: TestRunner,
  linter: Linter,
  formatter: Formatter
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const targets: any = {
    build: {
      executor: '@code-fixer-23/nx-tsup:build',
      outputs: ['{options.outDir}'],
      options: {
        outDir: `${projectRoot}/dist`,
        main: `${projectRoot}/src/index.ts`,
        tsConfig: `${projectRoot}/tsconfig.lib.json`,
        format: ['esm'],
        dts: true,
        clean: true,
        sourcemap: false,
        minify: false,
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
              passWithNoTests: true,
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

function createTsConfig(tree: Tree, projectRoot: string) {
  const tsconfig = {
    extends: '../../tsconfig.base.json',
    compilerOptions: {
      outDir: '../../dist/out-tsc',
      declaration: true,
      types: [],
    },
    include: ['src/**/*.ts'],
    exclude: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
  };

  tree.write(
    `${projectRoot}/tsconfig.lib.json`,
    JSON.stringify(tsconfig, null, 2)
  );

  const tsconfigMain = {
    extends: '../../tsconfig.json',
    files: [],
    references: [
      {
        path: './tsconfig.lib.json',
      },
    ],
  };

  tree.write(
    `${projectRoot}/tsconfig.json`,
    JSON.stringify(tsconfigMain, null, 2)
  );
}

function createPackageJson(
  tree: Tree,
  projectRoot: string,
  options: LibraryGeneratorSchema,
  testRunner: TestRunner,
  linter: Linter,
  formatter: Formatter
) {
  const isPackageBased = detectPackageBased(tree);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pkg: any = {
    name: options.importPath,
    version: '0.0.0',
    type: 'module',
    main: './dist/index.js',
    module: './dist/index.js',
    types: './dist/index.d.ts',
    exports: {
      '.': {
        types: './dist/index.d.ts',
        import: './dist/index.js',
        default: './dist/index.js',
      },
    },
    files: ['dist'],
    scripts: {
      build: 'tsup',
      typecheck: 'tsc -p tsconfig.lib.json --noEmit',
    },
    dependencies: {
      tslib: '^2.6.2',
    },
    devDependencies: {},
  };

  if (testRunner === 'vitest') {
    pkg.scripts.test = 'vitest run';
    pkg.devDependencies.vitest = '^3.0.0';
    pkg.devDependencies['@vitest/ui'] = '^3.0.0';
    pkg.devDependencies['happy-dom'] = '^15.0.0';
  } else if (testRunner === 'jest') {
    pkg.scripts.test = 'jest';
    pkg.devDependencies.jest = '^29.7.0';
    pkg.devDependencies['ts-jest'] = '^29.1.1';
    pkg.devDependencies['@types/jest'] = '^29.5.12';
  }

  if (linter === 'eslint') {
    pkg.devDependencies.eslint = '^9.9.0';
    pkg.devDependencies['@eslint/js'] = '^9.8.0';
  } else if (linter === 'biome') {
    pkg.devDependencies['@biomejs/biome'] = '^1.8.3';
  }

  // Add formatter dependencies
  if (formatter === 'prettier') {
    pkg.devDependencies.prettier = '^3.0.0';
    pkg.scripts.format = 'prettier --write .';
  } else if (formatter === 'biome' && linter !== 'biome') {
    // Only add if not already added by linter
    pkg.devDependencies['@biomejs/biome'] = '^1.8.3';
    pkg.scripts.format = 'biome format --write .';
  } else if (formatter === 'eslint-stylistic') {
    pkg.devDependencies['@stylistic/eslint-plugin'] = '^2.0.0';
    pkg.devDependencies['eslint-config-prettier'] = '^9.0.0';
    pkg.scripts.format = 'eslint --fix .';
  } else if (formatter === 'biome' && linter === 'biome') {
    // biome does both, add format script
    pkg.scripts.format = 'biome format --write .';
  }

  if (isPackageBased) {
    pkg.devDependencies.tsup = '^8.0.1';
  }

  tree.write(`${projectRoot}/package.json`, JSON.stringify(pkg, null, 2));
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
  const content = `export default {
  displayName: '${projectRoot}',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/${projectRoot}',
};
`;

  tree.write(`${projectRoot}/jest.config.ts`, content);
}

function createExampleTest(
  tree: Tree,
  projectRoot: string,
  runner: TestRunner
) {
  const testContent =
    runner === 'vitest'
      ? `import { describe, it, expect } from 'vitest';
import { hello } from './index';

describe('hello', () => {
  it('should return greeting', () => {
    expect(hello()).toContain('Hello');
  });
});
`
      : `import { hello } from './index';

describe('hello', () => {
  it('should return greeting', () => {
    expect(hello()).toContain('Hello');
  });
});
`;

  tree.write(`${projectRoot}/src/index.spec.ts`, testContent);
}

function createEslintConfig(tree: Tree, projectRoot: string, formatter: Formatter) {
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

${options.description || 'A TypeScript library built with Tsup'}

${testingInfo}## Installation

\`\`\`sh
# Using pnpm
pnpm add ${options.importPath}

# Or using JPD if available
jpd add ${options.importPath}
\`\`\`

## Usage

\`\`\`typescript
import { hello } from '${options.importPath}';

console.log(hello());
\`\`\`

## Development

\`\`\`sh
# Build the library
npx nx build ${options.name}

# Run type checking
npx nx typecheck ${options.name}${testCommand}
# Lint
npx nx lint ${options.name}
\`\`\`
`;

  tree.write(`${projectRoot}/README.md`, content);
}

function detectPackageBased(tree: Tree): boolean {
  try {
    const rootPkg = tree.read('package.json', 'utf-8');
    if (rootPkg) {
      const pkg = JSON.parse(rootPkg);
      return Boolean(pkg.workspaces);
    }
    return false;
  } catch {
    return false;
  }
}

export default libraryGenerator;
