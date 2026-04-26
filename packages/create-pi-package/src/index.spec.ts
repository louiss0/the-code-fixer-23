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
    const root = await mkdtemp(path.join(os.tmpdir(), 'create-pi-package-'));
    const directory = path.join(root, 'weather-kit');

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

    const packageJson = JSON.parse(
      await readFile(path.join(directory, 'package.json'), 'utf8')
    );
    const indexFile = await readFile(path.join(directory, 'src/index.ts'), 'utf8');

    expect(result.createdFiles).toContain('package.json');
    expect(packageJson).toMatchObject({
      name: 'weather-kit',
      type: 'module',
      types: 'dist/index.d.ts',
      typings: 'dist/index.d.ts',
    });
    expect(packageJson.scripts.build).toBe('vite build --minify');
    expect(packageJson.devDependencies).toHaveProperty('vite');
    expect(indexFile).toContain('export { prompts }');
    expect(indexFile).toContain('export { themes }');
    await expect(stat(path.join(directory, 'skills/example-skill/SKILL.md'))).resolves.toBeTruthy();
    await expect(stat(path.join(directory, 'vite.config.ts'))).resolves.toBeTruthy();
    await expect(stat(path.join(directory, 'vitest.config.ts'))).resolves.toBeTruthy();
  });
});
