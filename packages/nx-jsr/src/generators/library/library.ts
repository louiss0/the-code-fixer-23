import {
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  Tree,
  names,
  offsetFromRoot,
} from '@nx/devkit';
import * as path from 'path';
import { TestRunner, LibraryGeneratorSchema } from './schema';

export async function libraryGenerator(
  tree: Tree,
  options: LibraryGeneratorSchema
) {
  const directory = options.directory || 'packages';
  const projectRoot = `${directory}/${options.name}`;
  const parsedNames = names(options.name);
  const testRunner = options.testRunner || 'vitest';

  const targets = getProjectTargets(projectRoot, testRunner);

  addProjectConfiguration(tree, options.name, {
    root: projectRoot,
    projectType: 'library',
    sourceRoot: `${projectRoot}/src`,
    targets,
  });

  const templateOptions = {
    ...options,
    ...parsedNames,
    offsetFromRoot: offsetFromRoot(projectRoot),
    template: '',
  };

  generateFiles(
    tree,
    path.join(__dirname, 'files'),
    projectRoot,
    templateOptions
  );

  createJsrJson(tree, projectRoot, options);
  createTsConfig(tree, projectRoot, options);
  createPackageJson(tree, projectRoot, options, testRunner);
  createReadme(tree, projectRoot, options, testRunner);

  if (testRunner === 'vitest') {
    createVitestConfig(tree, projectRoot);
    createExampleTest(tree, projectRoot, 'vitest');
  } else if (testRunner === 'jest') {
    createJestConfig(tree, projectRoot);
    createExampleTest(tree, projectRoot, 'jest');
  }

  if (!options.skipFormat) {
    await formatFiles(tree);
  }
}

function getProjectTargets(projectRoot: string, testRunner: TestRunner) {
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
      options: {
        tsConfig: `${projectRoot}/tsconfig.lib.json`,
        noEmit: true,
      },
    },
    publish: {
      executor: '@the-code-fixer-23/nx-jsr:publish',
      options: {
        packageRoot: projectRoot,
      },
    },
  };

  if (testRunner === 'vitest') {
    targets.test = {
      executor: '@nx/vite:test',
      outputs: ['{projectRoot}/coverage'],
      options: {
        config: `${projectRoot}/vitest.config.ts`,
      },
    };
  } else if (testRunner === 'jest') {
    targets.test = {
      executor: '@nx/jest:jest',
      outputs: ['{projectRoot}/coverage'],
      options: {
        jestConfig: `${projectRoot}/jest.config.ts`,
      },
    };
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
  const content = `export default {
  displayName: '${projectRoot}',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
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
  const tsConfigLib = {
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
    JSON.stringify(tsConfigLib, null, 2)
  );

  const tsConfig = {
    extends: '../../tsconfig.json',
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
  testRunner: TestRunner
) {
  const devDependencies: Record<string, string> = {};

  if (testRunner === 'vitest') {
    devDependencies.vitest = '^2.0.0';
    devDependencies['@vitest/ui'] = '^2.0.0';
    devDependencies['happy-dom'] = '^15.0.0';
  } else if (testRunner === 'jest') {
    devDependencies.jest = '^29.0.0';
    devDependencies['@types/jest'] = '^29.0.0';
    devDependencies['ts-jest'] = '^29.0.0';
  }

  const packageJson: any = {
    name: options.importPath,
    version: '0.1.0',
    description: options.description || '',
    type: 'module',
  };

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
    testRunner !== 'none'
      ? `**Testing**: ${testRunner}\n\n`
      : '';

  const testCommand =
    testRunner !== 'none'
      ? `\n# Run tests\nnpx nx test ${options.name}\n`
      : '';

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
# Publish to JSR
npx nx publish ${options.name}
\`\`\`
`;

  tree.write(`${projectRoot}/README.md`, content);
}

export default libraryGenerator;
