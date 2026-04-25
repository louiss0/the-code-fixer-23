import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createPiPackage } from './create-pi-package.js';

const tempDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true }))
  );
});

describe('createPiPackage', () => {
  it('creates a source-mode package with eslint and vitest defaults', async () => {
    const targetDirectory = await createTempDirectory('weather-source-');

    const result = await createPiPackage({
      directory: targetDirectory,
      mode: 'source',
      name: 'weather-source',
      testRunner: 'vitest',
      tooling: 'eslint-prettier',
      yes: true,
    });

    const packageJson = JSON.parse(
      await readFile(path.join(targetDirectory, 'package.json'), 'utf8')
    ) as { exports: Record<string, unknown>; scripts: Record<string, string> };

    expect(result.skippedFiles).toEqual([]);
    expect(packageJson.exports['.']).toMatchObject({
      import: './lib/index.ts',
    });
    expect(packageJson.scripts.build).toContain('loadPiPackage');
    expect(
      await readFile(path.join(targetDirectory, 'pi-package.json'), 'utf8')
    ).toContain('source');
  });

  it('creates a bundle-mode package with tsup support', async () => {
    const targetDirectory = await createTempDirectory('weather-bundle-');

    await createPiPackage({
      directory: targetDirectory,
      mode: 'bundle',
      name: 'weather-bundle',
      testRunner: 'jest',
      tooling: 'biome',
      yes: true,
    });

    const packageJson = JSON.parse(
      await readFile(path.join(targetDirectory, 'package.json'), 'utf8')
    ) as { exports: Record<string, unknown>; scripts: Record<string, string> };

    expect(packageJson.exports['.']).toMatchObject({
      import: './dist/lib/index.js',
    });
    expect(packageJson.scripts.build).toContain('tsup --config tsup.config.ts');
    expect(
      await readFile(path.join(targetDirectory, 'tsup.config.ts'), 'utf8')
    ).toContain('minify: true');
    expect(
      await readFile(
        path.join(targetDirectory, 'scripts/prepare-dist.mjs'),
        'utf8'
      )
    ).toContain('cpSync');
  });
});

async function createTempDirectory(prefix: string) {
  const directory = await mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirectories.push(directory);
  return directory;
}
