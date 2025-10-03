import {
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  Tree,
  names,
  offsetFromRoot,
} from '@nx/devkit';
import * as path from 'path';
import { LibraryGeneratorSchema } from './schema';

export async function libraryGenerator(
  tree: Tree,
  options: LibraryGeneratorSchema
) {
  const directory = options.directory || 'packages';
  const projectRoot = `${directory}/${options.name}`;
  const parsedNames = names(options.name);

  addProjectConfiguration(tree, options.name, {
    root: projectRoot,
    projectType: 'library',
    sourceRoot: `${projectRoot}/src`,
    targets: {
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
    },
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
  createPackageJson(tree, projectRoot, options);
  createReadme(tree, projectRoot, options);

  if (!options.skipFormat) {
    await formatFiles(tree);
  }
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
  options: LibraryGeneratorSchema
) {
  const packageJson = {
    name: options.importPath,
    version: '0.1.0',
    description: options.description || '',
    type: 'module',
  };

  tree.write(
    `${projectRoot}/package.json`,
    JSON.stringify(packageJson, null, 2)
  );
}

function createReadme(
  tree: Tree,
  projectRoot: string,
  options: LibraryGeneratorSchema
) {
  const content = `# ${options.importPath}

${options.description || 'A TypeScript library for JSR'}

## Installation

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
npx nx typecheck ${options.name}

# Publish to JSR
npx nx publish ${options.name}
\`\`\`
`;

  tree.write(`${projectRoot}/README.md`, content);
}

export default libraryGenerator;
