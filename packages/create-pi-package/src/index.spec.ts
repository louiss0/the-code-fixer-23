import { mkdtemp, readFile, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createCommand, createPiPackage } from './index';
import {
  detectPackageManager,
  getInstallCommand,
} from './lib/detect-package-manager';
import type { CreatePiPackageInput } from './lib/types';

describe('createCommand', () => {
  it('parses create package flags with Commander typings', async () => {
    let parsedInput: CreatePiPackageInput | undefined;
    const command = createCommand(async (input) => {
      parsedInput = input;
    }, '1.2.3');

    await command.parseAsync(
      [
        'weather-kit',
        '--skills',
        '--prompts',
        '--bundle',
        '--bundler',
        'tsup',
        '--test-runner',
        'vitest',
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
      prompts: true,
      themes: undefined,
      skills: true,
      install: false,
      force: true,
    });
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
});

describe('createPiPackage', () => {
  it('writes a bundled PI package with selected feature templates', async () => {
    const directory = await createTemporaryPackageDirectory('weather-kit');

    const result = await createPiPackage({
      directory,
      bundle: true,
      bundler: 'vite',
      testRunner: 'vitest',
      prompts: true,
      themes: true,
      skills: true,
      install: false,
    });

    const packageJson = await readPackageJson(directory);
    const indexFile = await readFile(path.join(directory, 'src/index.ts'), 'utf8');

    expect(result.createdFiles).toContain('package.json');
    expect(packageJson).toMatchObject({
      name: 'weather-kit',
      type: 'module',
      types: 'dist/index.d.ts',
    });
    expect(packageJson).not.toHaveProperty('typings');
    expect(packageJson.scripts.build).toBe('vite build --minify');
    expect(packageJson.devDependencies).toHaveProperty('vite');
    expect(indexFile).toContain('export { prompts }');
    expect(indexFile).toContain('export { themes }');
    await expect(
      stat(path.join(directory, 'skills/example-skill/SKILL.md'))
    ).resolves.toBeTruthy();
    await expect(stat(path.join(directory, 'vite.config.ts'))).resolves.toBeTruthy();
    await expect(
      stat(path.join(directory, 'vitest.config.ts'))
    ).resolves.toBeTruthy();
  });

  it('writes an unbundled package without bundler config or bundler dependencies', async () => {
    const directory = await createTemporaryPackageDirectory('source-kit');

    await createPiPackage({
      directory,
      bundle: false,
      testRunner: 'vitest',
      prompts: true,
      install: false,
    });

    const packageJson = await readPackageJson(directory);

    expect(packageJson.scripts.build).toBe('tsc');
    expect(packageJson.devDependencies).not.toHaveProperty('tsup');
    expect(packageJson.devDependencies).not.toHaveProperty('vite');
    await expectFileMissing(path.join(directory, 'tsup.config.ts'));
    await expectFileMissing(path.join(directory, 'vite.config.ts'));
  });

  it('writes a tsup bundled package with tsup scripts and config', async () => {
    const directory = await createTemporaryPackageDirectory('tsup-kit');

    await createPiPackage({
      directory,
      bundle: true,
      bundler: 'tsup',
      testRunner: 'vitest',
      prompts: true,
      install: false,
    });

    const packageJson = await readPackageJson(directory);
    const tsupConfig = await readFile(path.join(directory, 'tsup.config.ts'), 'utf8');

    expect(packageJson.scripts.build).toBe(
      'tsup src/index.ts --format esm,cjs --dts --minify --clean'
    );
    expect(packageJson.devDependencies).toHaveProperty('tsup');
    expect(tsupConfig).toContain('minify: true');
    await expectFileMissing(path.join(directory, 'vite.config.ts'));
  });

  it('writes a Jest package with Jest config and test dependencies', async () => {
    const directory = await createTemporaryPackageDirectory('jest-kit');

    await createPiPackage({
      directory,
      bundle: false,
      testRunner: 'jest',
      prompts: true,
      install: false,
    });

    const packageJson = await readPackageJson(directory);
    const testFile = await readFile(path.join(directory, 'src/index.test.ts'), 'utf8');

    expect(packageJson.scripts.test).toBe('jest');
    expect(packageJson.devDependencies).toHaveProperty('jest');
    expect(packageJson.devDependencies).toHaveProperty('ts-jest');
    expect(packageJson.devDependencies).toHaveProperty('@types/jest');
    expect(testFile).not.toContain('from "vitest"');
    await expect(stat(path.join(directory, 'jest.config.js'))).resolves.toBeTruthy();
    await expectFileMissing(path.join(directory, 'vitest.config.ts'));
  });
});

async function createTemporaryPackageDirectory(packageName: string) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'create-pi-package-'));

  return path.join(root, packageName);
}

async function readPackageJson(directory: string) {
  return JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'));
}

async function expectFileMissing(filePath: string) {
  await expect(stat(filePath)).rejects.toMatchObject({ code: 'ENOENT' });
}
