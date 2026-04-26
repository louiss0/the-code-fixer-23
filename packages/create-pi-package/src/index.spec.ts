import { execFile } from 'node:child_process';
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

import { createCommand, createPiPackage } from './index';
import {
  detectPackageManager,
  getInstallCommand,
} from './lib/detect-package-manager';
import { getDependencyInstallCommand } from './lib/install-deps';
import type { CreatePiPackageInput } from './lib/types';

const execFileAsync = promisify(execFile);

describe('createCommand', () => {
  it('parses create package flags with Commander typings', async () => {
    let parsedInput: CreatePiPackageInput | undefined;
    const command = createCommand(async (input) => {
      parsedInput = input;
    }, '1.2.3');

    await command.parseAsync(
      [
        'weather-kit',
        '--extensions',
        '--skills',
        '--prompts',
        '--themes',
        '--bundle',
        '--bundler',
        'tsup',
        '--test-runner',
        'vitest',
        '--linter',
        'eslint',
        '--formatter',
        'prettier',
        '--no-install',
        '--force',
      ],
      { from: 'user' }
    );

    expect(parsedInput).toEqual({
      directory: 'weather-kit',
      bundle: true,
      bundler: 'tsup',
      testRunner: 'vitest',
      extensions: true,
      linter: 'eslint',
      formatter: 'prettier',
      prompts: true,
      themes: true,
      skills: true,
      install: false,
      force: true,
    });
  });

  it('does not expose a positive install flag because installation is default', async () => {
    const command = createCommand(async () => {
      throw new Error('action should not run');
    }, '1.2.3');

    command.exitOverride();
    command.configureOutput({ writeErr: () => undefined });

    await expect(
      command.parseAsync(['weather-kit', '--install'], { from: 'user' })
    ).rejects.toThrow("error: unknown option '--install'");
  });

  it('rejects unsupported bundlers before scaffolding starts', async () => {
    const command = createCommand(async () => {
      throw new Error('action should not run');
    }, '1.2.3');

    command.exitOverride();
    command.configureOutput({ writeErr: () => undefined });

    await expect(
      command.parseAsync(['weather-kit', '--bundler', 'webpack'], {
        from: 'user',
      })
    ).rejects.toThrow("Bundler must be either 'tsup' or 'vite'.");
  });

  it('rejects unsupported formatters for the selected linter before scaffolding starts', async () => {
    const command = createCommand(async () => {
      throw new Error('action should not run');
    }, '1.2.3');

    command.exitOverride();
    command.configureOutput({ writeErr: () => undefined });

    await expect(
      command.parseAsync(
        ['weather-kit', '--linter', 'biome', '--formatter', 'stylistic'],
        { from: 'user' }
      )
    ).rejects.toThrow("Formatter 'stylistic' cannot be used with linter 'biome'.");
  });

  it('rejects unsupported test runners before scaffolding starts', async () => {
    const command = createCommand(async () => {
      throw new Error('action should not run');
    }, '1.2.3');

    command.exitOverride();
    command.configureOutput({ writeErr: () => undefined });

    await expect(
      command.parseAsync(['weather-kit', '--test-runner', 'node:test'], {
        from: 'user',
      })
    ).rejects.toThrow("Test runner must be either 'vitest' or 'jest'.");
  });
});

describe('detectPackageManager', () => {
  it('detects package managers from npm user agent and exec path', () => {
    expect(
      detectPackageManager({ npm_config_user_agent: 'pnpm/10.0.0 node/v20' })
    ).toBe('pnpm');
    expect(
      detectPackageManager({ npm_config_user_agent: 'yarn/4.0.0 node/v20' })
    ).toBe('yarn');
    expect(detectPackageManager({ npm_execpath: '/opt/bun/bin/bun' })).toBe(
      'bun'
    );
    expect(detectPackageManager({})).toBe('npm');
  });

  it('returns the install command for each package manager', () => {
    expect(getInstallCommand('npm')).toEqual(['npm', 'install']);
    expect(getInstallCommand('pnpm')).toEqual(['pnpm', 'install']);
    expect(getInstallCommand('yarn')).toEqual(['yarn', 'install']);
    expect(getInstallCommand('bun')).toEqual(['bun', 'install']);
  });

  it('returns package-manager-specific development dependency commands', () => {
    expect(getDependencyInstallCommand('npm', ['typescript', 'eslint'])).toEqual([
      'npm',
      'install',
      '--save-dev',
      'typescript',
      'eslint',
    ]);
    expect(getDependencyInstallCommand('pnpm', ['typescript'])).toEqual([
      'pnpm',
      'add',
      '--save-dev',
      'typescript',
    ]);
    expect(getDependencyInstallCommand('yarn', ['typescript'])).toEqual([
      'yarn',
      'add',
      '--dev',
      'typescript',
    ]);
    expect(getDependencyInstallCommand('bun', ['typescript'])).toEqual([
      'bun',
      'add',
      '--dev',
      'typescript',
    ]);
  });
});

describe('createPiPackage', () => {
  it('writes all selected PI resource types together', async () => {
    const directory = await createTemporaryPackageDirectory('complete-kit');

    const result = await createPiPackage({
      directory,
      extensions: true,
      prompts: true,
      themes: true,
      skills: true,
      bundle: true,
      bundler: 'vite',
      testRunner: 'vitest',
      install: false,
    });

    const packageJson = await readPackageJson(directory);
    const indexFile = await readFile(path.join(directory, 'src/index.ts'), 'utf8');

    expect(result.createdFiles).toContain('package.json');
    expect(packageJson).toMatchObject({
      name: 'complete-kit',
      type: 'module',
      types: 'dist/index.d.ts',
      pi: {
        extensions: ['./extensions'],
        prompts: ['./prompts'],
        skills: ['./skills'],
        themes: ['./themes'],
      },
    });
    expect(packageJson).not.toHaveProperty('typings');
    expect(packageJson.scripts).toMatchObject({
      'create:extension': 'node scripts/create-extension.mjs',
      'create:prompt': 'node scripts/create-prompt.mjs',
      'create:skill': 'node scripts/create-skill.mjs',
      'create:theme': 'node scripts/create-theme.mjs',
    });
    expect(packageJson.scripts.build).toBe('vite build --minify');
    expect(packageJson.scripts.lint).toBe('eslint .');
    expect(packageJson.scripts.format).toBe('prettier --write .');
    expect(packageJson).not.toHaveProperty('dependencies');
    expect(packageJson).not.toHaveProperty('devDependencies');
    expect(result.summaryLines).toContain(
      'Install dev dependencies: npm install --save-dev typescript tsx vite vite-plugin-dts vitest eslint @eslint/js prettier'
    );
    expect(indexFile).toContain('export { prompts }');
    expect(indexFile).toContain('export { themes }');
    await expectFileExists(path.join(directory, 'extensions/example-extension.ts'));
    await expectFileExists(path.join(directory, 'prompts/example-prompt.md'));
    await expectFileExists(path.join(directory, 'skills/example-skill/SKILL.md'));
    await expectFileExists(path.join(directory, 'themes/default.json'));
    await expectFileExists(path.join(directory, 'scripts/create-extension.mjs'));
    await expectFileExists(path.join(directory, 'scripts/create-prompt.mjs'));
    await expectFileExists(path.join(directory, 'scripts/create-skill.mjs'));
    await expectFileExists(path.join(directory, 'scripts/create-theme.mjs'));
    await expectFileExists(path.join(directory, 'vite.config.ts'));
    await expectFileExists(path.join(directory, 'vitest.config.ts'));
  });

  it('writes prompt-only packages without bundler or test runner artifacts', async () => {
    const directory = await createTemporaryPackageDirectory('prompt-kit');

    await createPiPackage({
      directory,
      prompts: true,
      install: false,
    });

    const packageJson = await readPackageJson(directory);

    expect(packageJson.pi).toEqual({ prompts: ['./prompts'] });
    expect(packageJson.scripts).toHaveProperty('create:prompt');
    expect(packageJson.scripts).not.toHaveProperty('test');
    expect(packageJson.scripts.lint).toBe('eslint .');
    expect(packageJson.scripts.format).toBe('prettier --write .');
    expect(packageJson).not.toHaveProperty('dependencies');
    expect(packageJson).not.toHaveProperty('devDependencies');
    await expectFileExists(path.join(directory, 'prompts/example-prompt.md'));
    await expectFileExists(path.join(directory, 'scripts/create-prompt.mjs'));
    await expectFileMissing(path.join(directory, 'vitest.config.ts'));
    await expectFileMissing(path.join(directory, 'jest.config.js'));
    await expectFileMissing(path.join(directory, 'tsup.config.ts'));
    await expectFileMissing(path.join(directory, 'vite.config.ts'));
  });

  it('writes skill-only packages without bundler or test runner artifacts', async () => {
    const directory = await createTemporaryPackageDirectory('skill-kit');

    await createPiPackage({
      directory,
      skills: true,
      install: false,
    });

    const packageJson = await readPackageJson(directory);
    const skill = await readFile(
      path.join(directory, 'skills/example-skill/SKILL.md'),
      'utf8'
    );

    expect(packageJson.pi).toEqual({ skills: ['./skills'] });
    expect(packageJson.scripts).toHaveProperty('create:skill');
    expect(packageJson.scripts).not.toHaveProperty('test');
    expect(packageJson).not.toHaveProperty('dependencies');
    expect(packageJson).not.toHaveProperty('devDependencies');
    expect(skill).toContain('name: example-skill');
    expect(skill).toContain('description: An example PI skill.');
    await expectFileExists(path.join(directory, 'scripts/create-skill.mjs'));
    await expectFileMissing(path.join(directory, 'vitest.config.ts'));
    await expectFileMissing(path.join(directory, 'jest.config.js'));
  });

  it('writes theme-only packages without bundler or test runner questions reflected in artifacts', async () => {
    const directory = await createTemporaryPackageDirectory('theme-kit');

    await createPiPackage({
      directory,
      themes: true,
      install: false,
    });

    const packageJson = await readPackageJson(directory);
    const theme = JSON.parse(
      await readFile(path.join(directory, 'themes/default.json'), 'utf8')
    );

    expect(packageJson.pi).toEqual({ themes: ['./themes'] });
    expect(packageJson.scripts).toHaveProperty('create:theme');
    expect(packageJson.scripts).not.toHaveProperty('test');
    expect(packageJson).not.toHaveProperty('dependencies');
    expect(packageJson).not.toHaveProperty('devDependencies');
    expect(theme.name).toBe('default');
    expect(Object.keys(theme.colors)).toHaveLength(51);
    await expectFileExists(path.join(directory, 'scripts/create-theme.mjs'));
    await expectFileMissing(path.join(directory, 'vitest.config.ts'));
    await expectFileMissing(path.join(directory, 'jest.config.js'));
    await expectFileMissing(path.join(directory, 'tsup.config.ts'));
    await expectFileMissing(path.join(directory, 'vite.config.ts'));
  });

  it('writes extension packages with tsup scripts and a matching test suite', async () => {
    const directory = await createTemporaryPackageDirectory('extension-kit');

    await createPiPackage({
      directory,
      extensions: true,
      bundle: true,
      bundler: 'tsup',
      testRunner: 'jest',
      install: false,
    });

    const packageJson = await readPackageJson(directory);
    const extensionScript = await readFile(
      path.join(directory, 'scripts/create-extension.mjs'),
      'utf8'
    );
    const testFile = await readFile(
      path.join(directory, 'test/example-extension.test.ts'),
      'utf8'
    );

    expect(packageJson.pi).toEqual({ extensions: ['./extensions'] });
    expect(packageJson.scripts).toHaveProperty('create:extension');
    expect(packageJson.scripts.test).toBe('jest');
    expect(packageJson.scripts.build).toBe(
      'tsup extensions/*.ts --format esm,cjs --dts --minify --clean'
    );
    expect(packageJson.scripts.lint).toBe('eslint .');
    expect(packageJson.scripts.format).toBe('prettier --write .');
    expect(packageJson).not.toHaveProperty('dependencies');
    expect(packageJson).not.toHaveProperty('devDependencies');
    expect(extensionScript).toContain('--name');
    expect(extensionScript).toContain('testRunner = "jest"');
    expect(extensionScript).toContain('bundler = "tsup"');
    expect(testFile).not.toContain('from "vitest"');
    await expectFileExists(path.join(directory, 'extensions/example-extension.ts'));
    await expectFileExists(path.join(directory, 'test/example-extension.test.ts'));
    await expectFileExists(path.join(directory, 'tsup.config.ts'));
    await expectFileExists(path.join(directory, 'jest.config.js'));
    await expectFileMissing(path.join(directory, 'vite.config.ts'));
    await expectFileMissing(path.join(directory, 'vitest.config.ts'));
  });

  it('writes ESLint Stylistic formatter commands and config', async () => {
    const directory = await createTemporaryPackageDirectory('stylistic-kit');

    const result = await createPiPackage({
      directory,
      prompts: true,
      linter: 'eslint',
      formatter: 'stylistic',
      install: false,
    });

    const packageJson = await readPackageJson(directory);
    const eslintConfig = await readFile(path.join(directory, 'eslint.config.mjs'), 'utf8');

    expect(packageJson.scripts.lint).toBe('eslint .');
    expect(packageJson.scripts.format).toBe('eslint . --fix');
    expect(eslintConfig).toContain('@stylistic/eslint-plugin');
    expect(result.summaryLines).toContain(
      'Install dev dependencies: npm install --save-dev typescript tsx eslint @eslint/js @stylistic/eslint-plugin'
    );
  });

  it('writes Biome formatter commands when ESLint is the linter', async () => {
    const directory = await createTemporaryPackageDirectory('biome-format-kit');

    const result = await createPiPackage({
      directory,
      prompts: true,
      linter: 'eslint',
      formatter: 'biome',
      install: false,
    });

    const packageJson = await readPackageJson(directory);

    expect(packageJson.scripts.lint).toBe('eslint .');
    expect(packageJson.scripts.format).toBe('biome format --write .');
    expect(result.summaryLines).toContain(
      'Install dev dependencies: npm install --save-dev typescript tsx eslint @eslint/js @biomejs/biome'
    );
    await expectFileExists(path.join(directory, 'eslint.config.mjs'));
    await expectFileExists(path.join(directory, 'biome.json'));
  });

  it('writes Biome linter with Prettier formatter commands', async () => {
    const directory = await createTemporaryPackageDirectory('biome-lint-kit');

    const result = await createPiPackage({
      directory,
      prompts: true,
      linter: 'biome',
      formatter: 'prettier',
      install: false,
    });

    const packageJson = await readPackageJson(directory);

    expect(packageJson.scripts.lint).toBe('biome check .');
    expect(packageJson.scripts.format).toBe('prettier --write .');
    expect(result.summaryLines).toContain(
      'Install dev dependencies: npm install --save-dev typescript tsx @biomejs/biome prettier'
    );
    await expectFileExists(path.join(directory, 'biome.json'));
    await expectFileExists(path.join(directory, '.prettierrc.json'));
    await expectFileMissing(path.join(directory, 'eslint.config.mjs'));
  });

  it('writes prompt, skill, and theme scripts with flags and body-file support', async () => {
    const directory = await createTemporaryPackageDirectory('assets-kit');

    await createPiPackage({
      directory,
      prompts: true,
      skills: true,
      themes: true,
      install: false,
    });

    const promptScript = await readFile(
      path.join(directory, 'scripts/create-prompt.mjs'),
      'utf8'
    );
    const skillScript = await readFile(
      path.join(directory, 'scripts/create-skill.mjs'),
      'utf8'
    );
    const themeScript = await readFile(
      path.join(directory, 'scripts/create-theme.mjs'),
      'utf8'
    );

    expect(promptScript).toContain('--name');
    expect(promptScript).toContain('--body');
    expect(promptScript).toContain('--body-file');
    expect(skillScript).toContain('--name');
    expect(skillScript).toContain('--description');
    expect(skillScript).toContain('--body');
    expect(skillScript).toContain('--body-file');
    expect(themeScript).toContain('--name');
  });

  it('runs generated scaffold scripts with flags', async () => {
    const directory = await createTemporaryPackageDirectory('script-kit');
    const promptBodyPath = path.join(directory, 'prompt-body.md');
    const skillBodyPath = path.join(directory, 'skill-body.md');

    await createPiPackage({
      directory,
      extensions: true,
      prompts: true,
      skills: true,
      themes: true,
      bundle: true,
      bundler: 'vite',
      testRunner: 'vitest',
      install: false,
    });
    await writeFile(promptBodyPath, 'Prompt body from a file.');
    await writeFile(skillBodyPath, '# Skill Body\n\nDo the work.');

    await execFileAsync('node', ['scripts/create-extension.mjs', '--name', 'audit-helper'], {
      cwd: directory,
    });
    await execFileAsync(
      'node',
      ['scripts/create-prompt.mjs', '--name', 'daily-review', '--body-file', promptBodyPath],
      { cwd: directory }
    );
    await execFileAsync(
      'node',
      [
        'scripts/create-skill.mjs',
        '--name',
        'release-check',
        '--description',
        'Checks release readiness.',
        '--body-file',
        skillBodyPath,
      ],
      { cwd: directory }
    );
    await execFileAsync('node', ['scripts/create-theme.mjs', '--name', 'violet-night'], {
      cwd: directory,
    });

    const prompt = await readFile(path.join(directory, 'prompts/daily-review.md'), 'utf8');
    const skill = await readFile(
      path.join(directory, 'skills/release-check/SKILL.md'),
      'utf8'
    );
    const theme = JSON.parse(
      await readFile(path.join(directory, 'themes/violet-night.json'), 'utf8')
    );

    expect(prompt).toContain('Prompt body from a file.');
    expect(skill).toContain('name: release-check');
    expect(skill).toContain('description: Checks release readiness.');
    expect(skill).toContain('# Skill Body');
    expect(theme.name).toBe('violet-night');
    expect(Object.keys(theme.colors)).toHaveLength(51);
    await expectFileExists(path.join(directory, 'extensions/audit-helper.ts'));
    await expectFileExists(path.join(directory, 'test/audit-helper.test.ts'));
  });
});

async function createTemporaryPackageDirectory(packageName: string) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'create-pi-package-'));

  return path.join(root, packageName);
}

async function readPackageJson(directory: string) {
  return JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'));
}

async function expectFileExists(filePath: string) {
  await expect(stat(filePath)).resolves.toBeTruthy();
}

async function expectFileMissing(filePath: string) {
  await expect(stat(filePath)).rejects.toMatchObject({ code: 'ENOENT' });
}
