import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ExecutorContext } from '@nx/devkit';
import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import executor from './build';
import type { BuildExecutorSchema } from './schema';

vi.mock('node:child_process');
vi.mock('node:fs');

describe('Build Executor', () => {
  let context: ExecutorContext;
  let options: BuildExecutorSchema;

  beforeEach(() => {
    context = {
      root: '/workspace',
      cwd: '/workspace',
      isVerbose: false,
      projectName: 'test-lib',
      projectsConfigurations: {
        version: 2,
        projects: {
          'test-lib': {
            root: 'packages/test-lib',
          },
        },
      },
    };

    options = {
      outputPath: 'packages/test-lib/dist',
      main: 'packages/test-lib/src/index.ts',
      tsConfig: 'packages/test-lib/tsconfig.lib.json',
      format: ['esm'],
      dts: true,
      clean: true,
      sourcemap: false,
      minify: false,
    };

    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(childProcess, 'execSync').mockReturnValue(Buffer.from(''));
  });

  it('should validate required options', async () => {
    const invalidOptions = { ...options, outputPath: '' };
    const result = await executor(invalidOptions, context);

    expect(result.success).toBe(false);
  });

  it('should fail when entry file does not exist', async () => {
    vi.spyOn(fs, 'existsSync').mockImplementation((path) => {
      return !path.toString().includes('index.ts');
    });

    const result = await executor(options, context);

    expect(result.success).toBe(false);
  });

  it('should fail when tsconfig does not exist', async () => {
    vi.spyOn(fs, 'existsSync').mockImplementation((path) => {
      return !path.toString().includes('tsconfig');
    });

    const result = await executor(options, context);

    expect(result.success).toBe(false);
  });

  it('should build command with correct arguments', async () => {
    const execSyncSpy = vi.spyOn(childProcess, 'execSync');

    await executor(options, context);

    expect(execSyncSpy).toHaveBeenCalledWith(
      expect.stringContaining('tsup'),
      expect.objectContaining({
        stdio: 'inherit',
        cwd: '/workspace',
      })
    );

    const command = execSyncSpy.mock.calls[0][0] as string;
    expect(command).toContain('--format=esm');
    expect(command).toContain('--dts');
    expect(command).toContain('--clean');
  });

  it('should include watch flag when watch option is true', async () => {
    const execSyncSpy = vi.spyOn(childProcess, 'execSync');
    const watchOptions = { ...options, watch: true };

    await executor(watchOptions, context);

    const command = execSyncSpy.mock.calls[0][0] as string;
    expect(command).toContain('--watch');
  });

  it('should include minify flag when minify option is true', async () => {
    const execSyncSpy = vi.spyOn(childProcess, 'execSync');
    const minifyOptions = { ...options, minify: true };

    await executor(minifyOptions, context);

    const command = execSyncSpy.mock.calls[0][0] as string;
    expect(command).toContain('--minify');
  });

  it('should include sourcemap flag when sourcemap option is true', async () => {
    const execSyncSpy = vi.spyOn(childProcess, 'execSync');
    const sourcemapOptions = { ...options, sourcemap: true };

    await executor(sourcemapOptions, context);

    const command = execSyncSpy.mock.calls[0][0] as string;
    expect(command).toContain('--sourcemap');
  });

  it('should handle multiple formats', async () => {
    const execSyncSpy = vi.spyOn(childProcess, 'execSync');
    const multiFormatOptions = {
      ...options,
      format: ['esm', 'cjs'] as ('esm' | 'cjs')[],
    };

    await executor(multiFormatOptions, context);

    const command = execSyncSpy.mock.calls[0][0] as string;
    expect(command).toContain('--format=esm,cjs');
  });

  it('should return success true when build succeeds', async () => {
    const result = await executor(options, context);

    expect(result.success).toBe(true);
  });

  it('should return success false when build fails', async () => {
    vi.spyOn(childProcess, 'execSync').mockImplementation(() => {
      throw new Error('Build failed');
    });

    const result = await executor(options, context);

    expect(result.success).toBe(false);
  });

  it('should not include dts flag when dts option is false', async () => {
    const execSyncSpy = vi.spyOn(childProcess, 'execSync');
    const noDtsOptions = { ...options, dts: false };

    await executor(noDtsOptions, context);

    const command = execSyncSpy.mock.calls[0][0] as string;
    expect(command).not.toContain('--dts');
  });

  it('should not include clean flag when clean option is false', async () => {
    const execSyncSpy = vi.spyOn(childProcess, 'execSync');
    const noCleanOptions = { ...options, clean: false };

    await executor(noCleanOptions, context);

    const command = execSyncSpy.mock.calls[0][0] as string;
    expect(command).not.toContain('--clean');
  });
});
