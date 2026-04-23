import { defaultScope, packageKeywords } from './constants.js';
import type { PackageMode, TestRunner, ToolingPreset } from './types.js';
import { getScopedPackageName } from './name.js';

interface TemplateContext {
  mode: PackageMode;
  packageName: string;
  testRunner: TestRunner;
  tooling: ToolingPreset;
}

export function getManagedFileContentByPath(context: TemplateContext) {
  const scopedPackageName = getScopedPackageName(defaultScope, context.packageName);
  const files = new Map<string, string>();

  files.set('.gitignore', getGitIgnoreContent(context.mode));
  files.set('LICENSE', getLicenseContent());
  files.set('README.md', getReadmeContent({ ...context, scopedPackageName }));
  files.set('package.json', getPackageJsonContent({ ...context, scopedPackageName }));
  files.set('pi-package.json', JSON.stringify({ mode: context.mode }, null, 2) + '\n');
  files.set('tsconfig.json', getTsConfigContent());
  files.set('lib/index.ts', getHelperContent());
  files.set('extensions/weather-tools/package.json', getExtensionPackageJsonContent());
  files.set('extensions/weather-tools/README.md', getExtensionReadmeContent());
  files.set('skills/weather-brief/SKILL.md', getSkillContent());
  files.set('prompts/weather-report.md', getPromptContent());
  files.set('test/load-pi-package.test.ts', getTestContent(context.testRunner));

  if (context.testRunner === 'vitest') {
    files.set('vitest.config.ts', getVitestConfigContent());
  }

  if (context.testRunner === 'jest') {
    files.set('jest.config.ts', getJestConfigContent());
  }

  if (context.tooling === 'eslint-prettier') {
    files.set('eslint.config.mjs', getEslintConfigContent());
    files.set('.prettierrc.json', getPrettierConfigContent());
    files.set('.prettierignore', getPrettierIgnoreContent());
  }

  if (context.tooling === 'biome') {
    files.set('biome.json', getBiomeConfigContent());
  }

  if (context.mode === 'bundle') {
    files.set('tsup.config.ts', getTsupConfigContent());
    files.set('scripts/prepare-dist.mjs', getPrepareDistScriptContent());
  }

  return files;
}

function getPackageJsonContent(context: TemplateContext & { scopedPackageName: string }) {
  const packageJson = {
    name: context.scopedPackageName,
    version: '0.1.0',
    private: false,
    type: 'module',
    description: 'A scaffolded PI package with prompts, skills, and extensions.',
    keywords: [...packageKeywords],
    license: 'MIT',
    engines: {
      node: '>=20',
    },
    files: getPublishedFiles(context.mode),
    scripts: getScripts(context.mode, context.testRunner, context.tooling),
    exports: getExports(context.mode),
    ...(context.mode === 'bundle'
      ? {
          main: './dist/lib/index.js',
          types: './dist/lib/index.d.ts',
        }
      : {}),
    devDependencies: getDevDependencies(context.mode, context.testRunner, context.tooling),
  };

  return JSON.stringify(packageJson, null, 2) + '\n';
}

function getPublishedFiles(mode: PackageMode) {
  if (mode === 'bundle') {
    return ['dist', 'pi-package.json', 'README.md', 'LICENSE'];
  }

  return [
    'extensions',
    'skills',
    'prompts',
    'lib',
    'pi-package.json',
    'README.md',
    'LICENSE',
  ];
}

function getScripts(mode: PackageMode, testRunner: TestRunner, tooling: ToolingPreset) {
  const test = testRunner === 'vitest' ? 'vitest run' : 'jest --runInBand';
  const testWatch = testRunner === 'vitest' ? 'vitest' : 'jest --watch';
  const lint =
    tooling === 'biome' ? 'biome check .' : 'eslint .';
  const format =
    tooling === 'biome' ? 'biome format --write .' : 'prettier --write .';
  const typecheck = 'tsc -p tsconfig.json --noEmit';
  const build =
    mode === 'bundle'
      ? 'tsup --config tsup.config.ts && node ./scripts/prepare-dist.mjs'
      : 'node -e "import(\'./lib/index.ts\').then(({ loadPiPackage }) => { const result = loadPiPackage(process.cwd()); if (!result.isValid) { console.error(result.messages.join(\'\\n\')); process.exit(1); } })"';

  return {
    build,
    test,
    'test:watch': testWatch,
    lint,
    format,
    typecheck,
    check: 'npm run typecheck && npm run lint && npm run test && npm run build',
  };
}

function getExports(mode: PackageMode) {
  if (mode === 'bundle') {
    return {
      '.': {
        import: './dist/lib/index.js',
        types: './dist/lib/index.d.ts',
        default: './dist/lib/index.js',
      },
    };
  }

  return {
    '.': {
      import: './lib/index.ts',
      default: './lib/index.ts',
    },
  };
}

function getDevDependencies(mode: PackageMode, testRunner: TestRunner, tooling: ToolingPreset) {
  const devDependencies: Record<string, string> = {
    typescript: '^5.9.2',
    '@types/node': '^24.6.2',
    tslib: '^2.8.1',
  };

  if (testRunner === 'vitest') {
    devDependencies.vitest = '^3.2.4';
  } else {
    devDependencies.jest = '^29.7.0';
    devDependencies['@types/jest'] = '^29.5.14';
    devDependencies['ts-jest'] = '^29.4.9';
  }

  if (tooling === 'biome') {
    devDependencies['@biomejs/biome'] = '^1.9.4';
  } else {
    devDependencies.eslint = '^9.37.0';
    devDependencies['@eslint/js'] = '^9.37.0';
    devDependencies.prettier = '^2.8.8';
  }

  if (mode === 'bundle') {
    devDependencies.tsup = '^8.0.1';
  }

  return devDependencies;
}

function getReadmeContent(context: TemplateContext & { scopedPackageName: string }) {
  const modeNotes =
    context.mode === 'bundle'
      ? [
          '- `build` bundles `lib/` into `dist/` with Tsup.',
          '- `dist/` also contains `extensions/`, `skills/`, `prompts/`, and `pi-package.json`.',
        ]
      : [
          '- `build` validates the package contract in place.',
          '- PI handles source-mode execution directly from `lib/index.ts`.',
        ];

  return [
    `# ${context.scopedPackageName}`,
    '',
    'A scaffolded PI package with one coherent weather-focused example across prompts, skills, and extensions.',
    '',
    '## Why this package looks like this',
    '',
    'This package follows a fixed PI package convention:',
    '',
    '- `extensions/` contains extension packages.',
    '- `skills/` contains reusable skill documentation.',
    '- `prompts/` contains prompt files.',
    '- `lib/index.ts` exports the tiny `loadPiPackage` helper API used by tests and validation.',
    '',
    `**Mode**: ${context.mode}`,
    '',
    '## Development',
    '',
    `- Tooling preset: \`${context.tooling}\``,
    `- Test runner: \`${context.testRunner}\``,
    ...modeNotes,
    '',
    '## Commands',
    '',
    '- `npm run build`',
    '- `npm run test`',
    '- `npm run test:watch`',
    '- `npm run lint`',
    '- `npm run format`',
    '- `npm run typecheck`',
    '- `npm run check`',
    '',
  ].join('\n');
}

function getTsConfigContent() {
  return JSON.stringify(
    {
      compilerOptions: {
        module: 'nodenext',
        moduleResolution: 'nodenext',
        target: 'es2022',
        strict: true,
        noEmit: true,
        resolveJsonModule: true,
        esModuleInterop: true,
        types: ['node'],
      },
      include: ['lib/**/*.ts', 'test/**/*.ts'],
    },
    null,
    2
  ) + '\n';
}

function getHelperContent() {
  return `import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export interface LoadPiPackageResult {
  isValid: boolean;
  messages: string[];
  mode?: 'source' | 'bundle';
  paths?: {
    extensions: string;
    skills: string;
    prompts: string;
  };
}

export function loadPiPackage(packageRoot: string): LoadPiPackageResult {
  const messages: string[] = [];
  const manifestPath = path.join(packageRoot, 'pi-package.json');
  const packageJsonPath = path.join(packageRoot, 'package.json');
  const paths = {
    extensions: path.join(packageRoot, 'extensions'),
    skills: path.join(packageRoot, 'skills'),
    prompts: path.join(packageRoot, 'prompts'),
  };

  if (!existsSync(packageJsonPath)) {
    messages.push('Missing package.json.');
  }

  if (!existsSync(manifestPath)) {
    messages.push('Missing pi-package.json.');
  }

  let mode: 'source' | 'bundle' | undefined;

  if (existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
        mode?: string;
      };

      if (manifest.mode === 'source' || manifest.mode === 'bundle') {
        mode = manifest.mode;
      } else {
        messages.push('pi-package.json must declare mode as source or bundle.');
      }
    } catch {
      messages.push('pi-package.json must contain valid JSON.');
    }
  }

  for (const [label, folderPath] of Object.entries(paths)) {
    if (!existsSync(folderPath)) {
      messages.push(label + '/ directory is missing.');
    }
  }

  return {
    isValid: messages.length === 0,
    messages,
    mode,
    paths,
  };
}
`;
}

function getExtensionPackageJsonContent() {
  return JSON.stringify(
    {
      name: 'weather-tools',
      version: '0.1.0',
      private: true,
      description: 'Starter PI extension example for weather-oriented package flows.',
    },
    null,
    2
  ) + '\n';
}

function getExtensionReadmeContent() {
  return `# weather-tools

A starter extension example for the weather package theme.

Use this folder to add extension-specific runtime behavior for your PI package.
`;
}

function getSkillContent() {
  return `# Weather Brief

Use this skill when the user wants a short, decision-ready weather summary.

## Approach

- Focus on what changes the user's plan.
- Surface uncertainty clearly.
- Keep the recommendation actionable.
`;
}

function getPromptContent() {
  return `---
title: Weather report
---

Summarize the current weather situation, highlight the most important change from the baseline, and end with one practical recommendation.
`;
}

function getTestContent(testRunner: TestRunner) {
  if (testRunner === 'jest') {
    return `import { loadPiPackage } from '../lib/index';

describe('loadPiPackage', () => {
  it('returns a valid package contract for the scaffolded package', () => {
    const result = loadPiPackage(process.cwd());

    expect(result.isValid).toBe(true);
    expect(result.mode).toBeDefined();
    expect(result.paths).toBeDefined();
    expect(result.messages).toEqual([]);
  });
});
`;
  }

  return `import { describe, expect, it } from 'vitest';
import { loadPiPackage } from '../lib/index';

describe('loadPiPackage', () => {
  it('returns a valid package contract for the scaffolded package', () => {
    const result = loadPiPackage(process.cwd());

    expect(result.isValid).toBe(true);
    expect(result.mode).toBeDefined();
    expect(result.paths).toBeDefined();
    expect(result.messages).toEqual([]);
  });
});
`;
}

function getVitestConfigContent() {
  return `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node'
  }
});
`;
}

function getJestConfigContent() {
  return `export default {
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }]
  }
};
`;
}

function getEslintConfigContent() {
  return `import eslint from '@eslint/js';

export default [eslint.configs.recommended];
`;
}

function getPrettierConfigContent() {
  return `{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80,
  "arrowParens": "always"
}
`;
}

function getPrettierIgnoreContent() {
  return `dist
coverage
node_modules
`;
}

function getBiomeConfigContent() {
  return `{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "formatter": { "enabled": true },
  "linter": { "enabled": true }
}
`;
}

function getTsupConfigContent() {
  return `import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  dts: true,
  entry: ['lib/index.ts'],
  format: ['esm'],
  minify: true,
  outDir: 'dist/lib',
  target: 'node20'
});
`;
}

function getPrepareDistScriptContent() {
  return `import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const packageRoot = process.cwd();
const distRoot = path.join(packageRoot, 'dist');

mkdirSync(distRoot, { recursive: true });
cpSync(path.join(packageRoot, 'extensions'), path.join(distRoot, 'extensions'), { recursive: true });
cpSync(path.join(packageRoot, 'skills'), path.join(distRoot, 'skills'), { recursive: true });
cpSync(path.join(packageRoot, 'prompts'), path.join(distRoot, 'prompts'), { recursive: true });
cpSync(path.join(packageRoot, 'pi-package.json'), path.join(distRoot, 'pi-package.json'));

const packageJson = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
packageJson.files = ['dist', 'pi-package.json', 'README.md', 'LICENSE'];
writeFileSync(path.join(distRoot, 'package.json'), JSON.stringify(packageJson, null, 2) + '\\n');
`;
}

function getGitIgnoreContent(mode: PackageMode) {
  const lines = [
    '# Node',
    'node_modules/',
    'npm-debug.log*',
    'yarn-debug.log*',
    'yarn-error.log*',
    'pnpm-debug.log*',
    '',
    '# Test output',
    'coverage/',
    '',
    '# Editor folders',
    '.idea/',
    '.vscode/',
    '',
    '# System files',
    '.DS_Store',
    'Thumbs.db',
  ];

  if (mode === 'bundle') {
    lines.splice(8, 0, 'dist/', '');
  }

  return `${lines.join('\n')}\n`;
}

function getLicenseContent() {
  return `MIT License

Copyright (c) ${new Date().getFullYear()}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
}
