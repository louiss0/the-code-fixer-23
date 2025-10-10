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
import type { LibraryGeneratorSchema, TestRunner, Linter } from './schema.d.ts';
import {
  detectLinterFromRootPackageJson,
  detectTestRunnerFromRootPackageJson,
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

  const projectTargets = getProjectTargets(
    projectRoot,
    resolvedTestRunner,
    resolvedLinter
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
  });

  createTsConfig(tree, projectRoot);
  createPackageJson(
    tree,
    projectRoot,
    options,
    resolvedTestRunner,
    resolvedLinter
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
    createEslintConfig(tree, projectRoot);
  } else if (resolvedLinter === 'biome') {
    createBiomeConfig(tree, projectRoot);
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

function getProjectTargets(
  projectRoot: string,
  testRunner: TestRunner,
  linter: Linter
) {
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
  linter: Linter
) {
  const isPackageBased = detectPackageBased(tree);
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

function createEslintConfig(tree: Tree, projectRoot: string) {
  const content = `import eslint from '@eslint/js';

export default [eslint.configs.recommended];
`;

  tree.write(`${projectRoot}/eslint.config.mjs`, content);
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
