import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createPiPackage } from './lib/create-pi-package';
import { parseArgs } from './lib/parse-args';

describe('parseArgs', () => {
  it('parses the supported flags', () => {
    const result = parseArgs([
      '--directory',
      'tmp/example',
      '--name',
      'weather-kit',
      '--tooling',
      'biome',
      '--test-runner',
      'jest',
      '--mode',
      'bundle',
      '--yes',
      '--force',
    ]);

    expect(result.showHelp).toBe(false);
    expect(result.options).toMatchObject({
      directory: 'tmp/example',
      force: true,
      mode: 'bundle',
      name: 'weather-kit',
      testRunner: 'jest',
      tooling: 'biome',
      yes: true,
    });
  });
});

describe('createPiPackage', () => {
  it('writes a scaffolded PI package in bundle mode', async () => {
    const directory = await mkdtemp(
      path.join(os.tmpdir(), 'create-pi-package-')
    );
    const result = await createPiPackage({
      directory,
      mode: 'bundle',
      name: 'weather-kit',
      testRunner: 'vitest',
      tooling: 'eslint-prettier',
      yes: true,
    });

    const packageJson = JSON.parse(
      await readFile(path.join(directory, 'package.json'), 'utf8')
    );

    expect(result.createdFiles.length).toBeGreaterThan(0);
    expect(packageJson.name).toBe('@pi-packages/weather-kit');
    expect(packageJson.exports['.'].import).toBe('./dist/lib/index.js');
  });
});
