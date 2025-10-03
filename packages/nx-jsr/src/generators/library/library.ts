import {
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  Tree,
  names,
  offsetFromRoot,
} from '@nx/devkit';
import * as path from 'path';
import { Bundler, LibraryGeneratorSchema } from './schema';

export async function libraryGenerator(
  tree: Tree,
  options: LibraryGeneratorSchema
) {
  const directory = options.directory || 'packages';
  const projectRoot = `${directory}/${options.name}`;
  const parsedNames = names(options.name);
  const bundler = options.bundler || 'none';

  const buildTarget = getBuildTarget(projectRoot, bundler);

  addProjectConfiguration(tree, options.name, {
    root: projectRoot,
    projectType: 'library',
    sourceRoot: `${projectRoot}/src`,
    targets: {
      build: buildTarget,
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
  createPackageJson(tree, projectRoot, options, bundler);
  createReadme(tree, projectRoot, options, bundler);

  if (bundler === 'esbuild') {
    createEsbuildConfig(tree, projectRoot);
  } else if (bundler === 'tsup') {
    createTsupConfig(tree, projectRoot);
  }

  if (!options.skipFormat) {
    await formatFiles(tree);
  }
}

function getBuildTarget(projectRoot: string, bundler: Bundler) {
  switch (bundler) {
    case 'esbuild':
      return {
        executor: '@nx/esbuild:esbuild',
        outputs: ['{options.outputPath}'],
        options: {
          outputPath: `dist/${projectRoot}`,
          main: `${projectRoot}/src/index.ts`,
          tsConfig: `${projectRoot}/tsconfig.lib.json`,
          assets: [`${projectRoot}/*.md`, `${projectRoot}/jsr.json`],
          format: ['esm'],
          platform: 'neutral',
          target: 'es2022',
        },
      };
    case 'tsup':
      return {
        executor: 'nx:run-commands',
        outputs: ['{projectRoot}/dist'],
        options: {
          command: 'tsup',
          cwd: projectRoot,
        },
      };
    case 'none':
    default:
      return {
        executor: '@nx/js:tsc',
        outputs: ['{options.outputPath}'],
        options: {
          outputPath: `dist/${projectRoot}`,
          main: `${projectRoot}/src/index.ts`,
          tsConfig: `${projectRoot}/tsconfig.lib.json`,
          assets: [`${projectRoot}/*.md`, `${projectRoot}/jsr.json`],
        },
      };
  }
}

function createEsbuildConfig(tree: Tree, projectRoot: string) {
  const content = `const { build } = require('esbuild');

build({
  entryPoints: ['./src/index.ts'],
  bundle: true,
  outfile: './dist/index.js',
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  sourcemap: true,
  minify: false,
  external: [],
}).catch(() => process.exit(1));
`;

  tree.write(`${projectRoot}/esbuild.config.js`, content);
}

function createTsupConfig(tree: Tree, projectRoot: string) {
  const content = `import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  target: 'es2022',
  platform: 'neutral',
});
`;

  tree.write(`${projectRoot}/tsup.config.ts`, content);
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
  bundler: Bundler
) {
  const devDependencies: Record<string, string> = {};

  if (bundler === 'esbuild') {
    devDependencies.esbuild = '^0.20.0';
  } else if (bundler === 'tsup') {
    devDependencies.tsup = '^8.0.0';
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
  bundler: Bundler
) {
  const bundlerInfo = bundler !== 'none' ? ` (using ${bundler})` : '';
  
  const content = `# ${options.importPath}

${options.description || 'A TypeScript library for JSR'}

**Build tool**: ${bundler === 'none' ? 'TypeScript compiler (tsc)' : bundler}${bundlerInfo}

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
