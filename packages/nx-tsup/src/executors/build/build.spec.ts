import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ExecutorContext } from '@nx/devkit';
import * as fs from 'node:fs';
import * as path from 'node:path';
import executor from './build';
import type { BuildExecutorSchema } from './schema';

// Mock tsup
vi.mock('tsup', () => ({
  build: vi.fn().mockResolvedValue(undefined),
}));

// Mock esbuild for config loading
vi.mock('esbuild', () => ({
  build: vi.fn().mockResolvedValue({
    outputFiles: [{ text: 'module.exports = { target: "es2020" };' }],
  }),
}));

const mockTsupBuild = vi.mocked((await import('tsup')).build);

describe('Build Executor', () => {
  let context: ExecutorContext;
  let options: BuildExecutorSchema;
  let existsSyncSpy: any;
  let readdirSyncSpy: any;

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
      outDir: 'packages/test-lib/dist',
      main: 'packages/test-lib/src/index.ts',
      tsConfig: 'packages/test-lib/tsconfig.lib.json',
      format: ['esm'],
      dts: true,
      clean: true,
      sourcemap: false,
      minify: false,
    };

    // Setup default mocks
    existsSyncSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    readdirSyncSpy = vi.spyOn(fs, 'readdirSync').mockReturnValue([]);
    mockTsupBuild.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Validation', () => {
    it('should validate required option: outDir', async () => {
      const invalidOptions = { ...options, outDir: '' };
      const result = await executor(invalidOptions, context);

      expect(result.success).toBe(false);
    });

    it('should validate required option: main', async () => {
      const invalidOptions = { ...options, main: '' };
      const result = await executor(invalidOptions, context);

      expect(result.success).toBe(false);
    });

    it('should validate required option: tsConfig', async () => {
      const invalidOptions = { ...options, tsConfig: '' };
      const result = await executor(invalidOptions, context);

      expect(result.success).toBe(false);
    });

    it('should fail when entry file does not exist', async () => {
      existsSyncSpy.mockImplementation((p: any) => {
        return !p.toString().includes('index.ts');
      });

      const result = await executor(options, context);

      expect(result.success).toBe(false);
    });

    it('should fail when tsconfig does not exist', async () => {
      existsSyncSpy.mockImplementation((p: any) => {
        return !p.toString().includes('tsconfig');
      });

      const result = await executor(options, context);

      expect(result.success).toBe(false);
    });
  });

  describe('Config File Discovery', () => {
    it('should find tsup.config.ts', async () => {
      existsSyncSpy.mockImplementation((p: any) => {
        return p.toString().includes('tsup.config.ts') || 
               p.toString().includes('index.ts') || 
               p.toString().includes('tsconfig');
      });

      await executor(options, context);

      expect(mockTsupBuild).toHaveBeenCalled();
    });

    it('should find tsup.config.js', async () => {
      existsSyncSpy.mockImplementation((p: any) => {
        return p.toString().includes('tsup.config.js') || 
               p.toString().includes('index.ts') || 
               p.toString().includes('tsconfig');
      });

      await executor(options, context);

      expect(mockTsupBuild).toHaveBeenCalled();
    });

    it('should work without config file (project.json only)', async () => {
      existsSyncSpy.mockImplementation((p: any) => {
        return p.toString().includes('index.ts') || p.toString().includes('tsconfig');
      });

      const result = await executor(options, context);

      expect(result.success).toBe(true);
      expect(mockTsupBuild).toHaveBeenCalled();
    });
  });

  describe('Options Merging - Primitives', () => {
    it('should pass outDir to tsup', async () => {
      await executor(options, context);

      expect(mockTsupBuild).toHaveBeenCalledWith(
        expect.objectContaining({
          outDir: expect.stringContaining('packages/test-lib/dist'),
        })
      );
    });

    it('should pass main as entry array to tsup', async () => {
      await executor(options, context);

      expect(mockTsupBuild).toHaveBeenCalledWith(
        expect.objectContaining({
          entry: expect.arrayContaining([expect.stringContaining('index.ts')]),
        })
      );
    });

    it('should pass tsConfig to tsup as tsconfig', async () => {
      await executor(options, context);

      expect(mockTsupBuild).toHaveBeenCalledWith(
        expect.objectContaining({
          tsconfig: expect.stringContaining('tsconfig.lib.json'),
        })
      );
    });

    it('should merge dts option', async () => {
      await executor({ ...options, dts: true }, context);

      expect(mockTsupBuild).toHaveBeenCalledWith(
        expect.objectContaining({ dts: true })
      );
    });

    it('should merge clean option', async () => {
      await executor({ ...options, clean: false }, context);

      expect(mockTsupBuild).toHaveBeenCalledWith(
        expect.objectContaining({ clean: false })
      );
    });

    it('should merge minify option', async () => {
      await executor({ ...options, minify: true }, context);

      expect(mockTsupBuild).toHaveBeenCalledWith(
        expect.objectContaining({ minify: true })
      );
    });

    it('should merge sourcemap option', async () => {
      await executor({ ...options, sourcemap: true }, context);

      expect(mockTsupBuild).toHaveBeenCalledWith(
        expect.objectContaining({ sourcemap: true })
      );
    });

    it('should merge sourcemap as inline string', async () => {
      await executor({ ...options, sourcemap: 'inline' }, context);

      expect(mockTsupBuild).toHaveBeenCalledWith(
        expect.objectContaining({ sourcemap: 'inline' })
      );
    });
  });

  describe('Options Merging - New Tsup Options', () => {
    it('should merge splitting option', async () => {
      await executor({ ...options, splitting: true }, context);

      expect(mockTsupBuild).toHaveBeenCalledWith(
        expect.objectContaining({ splitting: true })
      );
    });

    it('should merge treeshake option as boolean', async () => {
      await executor({ ...options, treeshake: true }, context);

      expect(mockTsupBuild).toHaveBeenCalledWith(
        expect.objectContaining({ treeshake: true })
      );
    });

    it('should merge treeshake option as string', async () => {
      await executor({ ...options, treeshake: 'smallest' }, context);

      expect(mockTsupBuild).toHaveBeenCalledWith(
        expect.objectContaining({ treeshake: 'smallest' })
      );
    });

    it('should merge target option', async () => {
      await executor({ ...options, target: 'esnext' }, context);

      expect(mockTsupBuild).toHaveBeenCalledWith(
        expect.objectContaining({ target: 'esnext' })
      );
    });

    it('should merge platform option', async () => {
      await executor({ ...options, platform: 'browser' }, context);

      expect(mockTsupBuild).toHaveBeenCalledWith(
        expect.objectContaining({ platform: 'browser' })
      );
    });
  });

  describe('Options Merging - Arrays', () => {
    it('should merge external array option', async () => {
      const externalDeps = ['react', 'react-dom'];
      await executor({ ...options, external: externalDeps }, context);

      expect(mockTsupBuild).toHaveBeenCalledWith(
        expect.objectContaining({ external: externalDeps })
      );
    });

    it('should merge noExternal array option', async () => {
      const noExternalDeps = ['lodash'];
      await executor({ ...options, noExternal: noExternalDeps }, context);

      expect(mockTsupBuild).toHaveBeenCalledWith(
        expect.objectContaining({ noExternal: noExternalDeps })
      );
    });

    it('should merge inject array option', async () => {
      const injectFiles = ['./polyfills.ts'];
      await executor({ ...options, inject: injectFiles }, context);

      expect(mockTsupBuild).toHaveBeenCalledWith(
        expect.objectContaining({ inject: injectFiles })
      );
    });
  });

  describe('Options Merging - Objects', () => {
    it('should merge banner object', async () => {
      const banner = { js: '// Custom banner', css: '/* CSS banner */' };
      await executor({ ...options, banner }, context);

      expect(mockTsupBuild).toHaveBeenCalledWith(
        expect.objectContaining({ banner })
      );
    });

    it('should merge footer object', async () => {
      const footer = { js: '// Custom footer' };
      await executor({ ...options, footer }, context);

      expect(mockTsupBuild).toHaveBeenCalledWith(
        expect.objectContaining({ footer })
      );
    });

    it('should merge env object', async () => {
      const env = { NODE_ENV: 'production', API_URL: 'https://api.example.com' };
      await executor({ ...options, env }, context);

      expect(mockTsupBuild).toHaveBeenCalledWith(
        expect.objectContaining({ env })
      );
    });

    it('should merge define object', async () => {
      const define = { __VERSION__: '"1.0.0"', __DEBUG__: 'false' };
      await executor({ ...options, define }, context);

      expect(mockTsupBuild).toHaveBeenCalledWith(
        expect.objectContaining({ define })
      );
    });

    it('should merge esbuildOptions object', async () => {
      const esbuildOptions = { keepNames: true, legalComments: 'none' };
      await executor({ ...options, esbuildOptions }, context);

      const call = mockTsupBuild.mock.calls[0][0];
      expect(call.esbuildOptions).toBeDefined();
      expect(typeof call.esbuildOptions).toBe('function');
    });
  });

  describe('CLI-only Flags', () => {
    it('should apply watch flag at runtime', async () => {
      await executor({ ...options, watch: true }, context);

      expect(mockTsupBuild).toHaveBeenCalledWith(
        expect.objectContaining({ watch: true })
      );
    });

    it('should apply format flag at runtime', async () => {
      await executor({ ...options, format: ['esm', 'cjs'] }, context);

      expect(mockTsupBuild).toHaveBeenCalledWith(
        expect.objectContaining({ format: ['esm', 'cjs'] })
      );
    });

    it('should not pass watch if false', async () => {
      await executor({ ...options, watch: false }, context);

      const call = mockTsupBuild.mock.calls[0][0];
      expect(call.watch).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should return success false when tsup build fails', async () => {
      mockTsupBuild.mockRejectedValueOnce(new Error('Build failed'));

      const result = await executor(options, context);

      expect(result.success).toBe(false);
    });

    it('should handle missing outDir after merge', async () => {
      // This shouldn't happen due to validation, but test the merge logic
      const invalidOptions = { ...options, outDir: '' };
      const result = await executor(invalidOptions, context);

      expect(result.success).toBe(false);
    });
  });

  describe('Asset Copying', () => {
    it('should copy assets when specified', async () => {
      const cpSpy = vi.spyOn(fs.promises, 'cp').mockResolvedValue(undefined);
      const mkdirSpy = vi.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);

      await executor({ ...options, assets: ['README.md', 'LICENSE'] }, context);

      expect(mkdirSpy).toHaveBeenCalled();
      expect(cpSpy).toHaveBeenCalled();
    });

    it('should not copy assets when array is empty', async () => {
      const cpSpy = vi.spyOn(fs.promises, 'cp').mockResolvedValue(undefined);

      await executor({ ...options, assets: [] }, context);

      expect(cpSpy).not.toHaveBeenCalled();
    });
  });

  describe('Build Success', () => {
    it('should return success true when build succeeds', async () => {
      const result = await executor(options, context);

      expect(result.success).toBe(true);
    });

    it('should call tsup.build with merged options', async () => {
      await executor(options, context);

      expect(mockTsupBuild).toHaveBeenCalledTimes(1);
      expect(mockTsupBuild).toHaveBeenCalledWith(
        expect.objectContaining({
          outDir: expect.any(String),
          entry: expect.any(Array),
          tsconfig: expect.any(String),
        })
      );
    });
  });
});
