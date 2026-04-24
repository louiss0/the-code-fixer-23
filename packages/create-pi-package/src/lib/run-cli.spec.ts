import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as promptModule from './prompt.js';
import { runCli } from './run-cli.js';

const tempDirectories: string[] = [];

beforeEach(() => {
  vi.spyOn(promptModule, 'isInteractiveSession').mockReturnValue(false);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    tempDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true })
    )
  );
});

describe('runCli', () => {
  it('fails fast in non-interactive mode when required options are missing', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const statusCode = await runCli([]);

    expect(statusCode).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Missing required options in non-interactive mode')
    );
  });

  it('uses --yes defaults in non-interactive mode', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const targetDirectory = await createTempDirectory('cli-defaults-');

    const statusCode = await runCli([
      '--directory',
      targetDirectory,
      '--name',
      'cli-defaults',
      '--yes',
    ]);

    expect(statusCode).toBe(0);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Mode: source'));
  });
});

async function createTempDirectory(prefix: string) {
  const directory = await mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirectories.push(directory);
  return directory;
}
