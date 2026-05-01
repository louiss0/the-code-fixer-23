import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  type Tree,
  addProjectConfiguration,
  formatFiles,
  getDependencyVersionFromPackageJson,
  getPackageManagerCommand,
  generateFiles,
  joinPathFragments,
  logger,
  names,
  offsetFromRoot,
} from '@nx/devkit';
import {
  detectFormatterFromRootPackageJson,
  detectLinterFromRootPackageJson,
  detectTestRunnerFromRootPackageJson,
} from './detect.js';
import { isInteractive, selectOrDefault } from './prompt.js';
import type {
  Formatter,
  LibraryGeneratorSchema,
  Linter,
  TestRunner,
} from './schema.d.ts';

const generatorFilesPath = join(
  dirname(fileURLToPath(import.meta.url)),
  'files',
);

export async function libraryGenerator(
  tree: Tree,
  options: LibraryGeneratorSchema,
) {
  const name = names(options.name).fileName;
  const dir = options.directory ?? 'packages';
  const projectRoot = joinPathFragments(dir, name);
  const sourceRoot = joinPathFragments(projectRoot, 'src');

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

  addProjectConfiguration(tree, name, {
    root: projectRoot,
    projectType: 'library',
    sourceRoot,
    targets: {},
    tags: [],
  });

  // Templates
  generateFiles(tree, generatorFilesPath, projectRoot, {
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
  createTsSpecConfig(tree, projectRoot, resolvedTestRunner);
  createPackageJson(
    tree,
    projectRoot,
    options,
    resolvedTestRunner,
    resolvedLinter,
    resolvedFormatter,
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
    (c: string) => c !== 'eslint-stylistic' || linter === 'eslint',
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

function createTsConfig(tree: Tree, projectRoot: string) {
  const rootOffset = offsetFromRoot(projectRoot);
  const tsconfig = {
    extends: `${rootOffset}tsconfig.base.json`,
    compilerOptions: {
      outDir: `${rootOffset}dist/out-tsc`,
      declaration: true,
      types: [],
    },
    include: ['src/**/*.ts'],
    exclude: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
  };

  tree.write(
    `${projectRoot}/tsconfig.lib.json`,
    JSON.stringify(tsconfig, null, 2),
  );

  const tsconfigMain = {
    extends: `${rootOffset}tsconfig.json`,
    files: [],
    references: [
      {
        path: './tsconfig.lib.json',
      },
    ],
  };

  tree.write(
    `${projectRoot}/tsconfig.json`,
    JSON.stringify(tsconfigMain, null, 2),
  );
}

function createTsSpecConfig(
  tree: Tree,
  projectRoot: string,
  testRunner: TestRunner,
) {
  if (testRunner === 'none') {
    return;
  }

  const rootOffset = offsetFromRoot(projectRoot);
  const types =
    testRunner === 'vitest'
      ? ['vitest/globals', 'vitest/importMeta', 'vite/client', 'node']
      : ['jest', 'node'];
  const tsconfigSpec = {
    extends: './tsconfig.json',
    compilerOptions: {
      outDir: `${rootOffset}dist/out-tsc`,
      types,
    },
    include: ['src/**/*.spec.ts', 'src/**/*.test.ts', 'src/**/*.d.ts'],
  };

  tree.write(
    `${projectRoot}/tsconfig.spec.json`,
    JSON.stringify(tsconfigSpec, null, 2),
  );
}

function createPackageJson(
  tree: Tree,
  projectRoot: string,
  options: LibraryGeneratorSchema,
  testRunner: TestRunner,
  linter: Linter,
  formatter: Formatter,
) {
  const packageManagerCommand = getPackageManagerCommand(
    detectPackageManagerFromTree(tree),
  );
  const pkg: {
    name: string;
    version: string;
    type: string;
    main: string;
    module: string;
    types: string;
    exports: Record<string, unknown>;
    files: string[];
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  } = {
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
      build: 'tsup --config tsup.config.ts',
      dev: 'tsup --config tsup.config.ts --watch',
      typecheck: 'tsc -p tsconfig.lib.json --noEmit',
    },
    dependencies: {
      tslib: '^2.6.2',
    },
    devDependencies: {},
  };

  if (testRunner === 'vitest') {
    pkg.scripts.test = 'vitest run --config vitest.config.ts';
    pkg.devDependencies.vitest = getDependencyVersion(tree, 'vitest');
    pkg.devDependencies['@vitest/ui'] = getDependencyVersion(
      tree,
      '@vitest/ui',
    );
    pkg.devDependencies['happy-dom'] = getDependencyVersion(tree, 'happy-dom');
  } else if (testRunner === 'jest') {
    pkg.scripts.test = 'jest --config jest.config.ts';
    pkg.devDependencies.jest = getDependencyVersion(tree, 'jest');
    pkg.devDependencies['ts-jest'] = getDependencyVersion(tree, 'ts-jest');
    pkg.devDependencies['@types/jest'] = getDependencyVersion(
      tree,
      '@types/jest',
    );
  }

  if (linter === 'eslint') {
    pkg.scripts.lint = 'eslint . --config eslint.config.mjs';
    pkg.scripts['configure:eslint'] =
      `${packageManagerCommand.dlx} @eslint/create-config@latest`;
    pkg.devDependencies.eslint = getDependencyVersion(tree, 'eslint');
    pkg.devDependencies['@eslint/js'] = getDependencyVersion(
      tree,
      '@eslint/js',
    );
  } else if (linter === 'biome') {
    pkg.scripts.lint = 'biome lint .';
    pkg.devDependencies['@biomejs/biome'] = getDependencyVersion(
      tree,
      '@biomejs/biome',
    );
  }

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

  pkg.devDependencies.tsup = getDependencyVersion(tree, 'tsup');

  tree.write(`${projectRoot}/package.json`, JSON.stringify(pkg, null, 2));
}

function getDependencyVersion(tree: Tree, name: string): string {
  return getDependencyVersionFromPackageJson(tree, name) ?? 'latest';
}

function detectPackageManagerFromTree(tree: Tree) {
  if (tree.exists('pnpm-lock.yaml')) return 'pnpm';
  if (tree.exists('package-lock.json')) return 'npm';
  if (tree.exists('yarn.lock')) return 'yarn';
  if (tree.exists('bun.lockb') || tree.exists('bun.lock')) return 'bun';
  return 'pnpm';
}

function createVitestConfig(tree: Tree, projectRoot: string) {
  const content = `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    coverage: { provider: 'v8' },
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
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        useESM: true,
      },
    ],
  },
  moduleNameMapper: {
    '^(\\\\.{1,2}/.*)\\\\.js$': '$1',
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
  runner: TestRunner,
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

function createReadme(
  tree: Tree,
  projectRoot: string,
  options: LibraryGeneratorSchema,
  testRunner: TestRunner,
) {
  const packageManager = detectPackageManagerFromTree(tree);
  const packageManagerCommand = getPackageManagerCommand(packageManager);
  const installCommand = `${packageManagerCommand.add} ${options.importPath}`;
  const testingInfo =
    testRunner !== 'none' ? `**Testing**: ${testRunner}\n\n` : '';
  const testCommand =
    testRunner !== 'none'
      ? `\n# Run tests\n${packageManagerCommand.run('test')}\n`
      : '';

  const content = `# ${options.importPath}

${options.description || 'A TypeScript library built with Tsup'}

${testingInfo}## Installation

\`\`\`sh
${installCommand}
\`\`\`

## Usage

\`\`\`typescript
import { hello } from '${options.importPath}';

console.log(hello());
\`\`\`

## Development

\`\`\`sh
# Build the library
${packageManagerCommand.run('build')}

# Watch for changes
${packageManagerCommand.run('dev')}

# Run type checking
${packageManagerCommand.run('typecheck')}${testCommand}
# Lint
${packageManagerCommand.run('lint')}
\`\`\`
`;

  tree.write(`${projectRoot}/README.md`, content);
}

export default libraryGenerator;
