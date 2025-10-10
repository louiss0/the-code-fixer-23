import type { ExecutorContext } from '@nx/devkit';
import { logger } from '@nx/devkit';
import { existsSync, promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import type { BuildExecutorSchema } from './schema.d.ts';
import type { Options as TsupOptions } from 'tsup';
import { build as tsupBuild } from 'tsup';

type TsupConfig =
  | TsupOptions
  | TsupOptions[]
  | ((env: {
      watch: boolean;
      format?: string[];
      mode?: string;
    }) => TsupOptions | TsupOptions[] | Promise<TsupOptions | TsupOptions[]>);

export default async function runExecutor(
  options: BuildExecutorSchema,
  context: ExecutorContext
): Promise<{ success: boolean }> {
  try {
    const root = context.root || process.cwd();
    const projectName = context.projectName || '';
    const projectConfig =
      context.projectsConfigurations?.projects?.[projectName];
    const projectRoot = projectConfig?.root
      ? resolve(root, projectConfig.root)
      : root;

    // Validate required options
    if (!options.outDir || !options.main || !options.tsConfig) {
      logger.error('Missing required options: outDir, main, tsConfig');
      return { success: false };
    }

    const outDir = resolve(root, options.outDir);
    const entry = resolve(root, options.main);
    const tsconfig = resolve(root, options.tsConfig);

    if (!existsSync(entry)) {
      logger.error(`Entry not found: ${entry}`);
      return { success: false };
    }
    if (!existsSync(tsconfig)) {
      logger.error(`tsconfig not found: ${tsconfig}`);
      return { success: false };
    }

    // Find and load tsup config file if it exists
    const configPath = findTsupConfig(projectRoot);
    const configFromFile = configPath
      ? await loadTsupConfig(configPath, {
          watch: options.watch ?? false,
          format: options.format,
        })
      : undefined;

    // Merge options from config file and project.json
    const mergedOptions = await mergeOptions({
      fromFile: configFromFile,
      fromProject: options,
      projectRoot,
      root,
    });

    // Apply CLI-only flags
    if (options.watch) {
      mergedOptions.watch = true;
    }
    if (options.format && options.format.length > 0) {
      mergedOptions.format = options.format;
    }

    logger.info(`Building ${projectName}...`);
    logger.info(`Output: ${outDir}`);

    // Run tsup build
    await tsupBuild(mergedOptions);

    // Copy assets if specified
    if (options.assets?.length) {
      await copyAssets(root, options.assets, outDir);
    }

    logger.info(`✓ Build complete: ${outDir}`);
    return { success: true };
  } catch (e: unknown) {
    const error = e as { message?: string; stack?: string };
    logger.error(`Build failed: ${error?.message ?? String(e)}`);
    if (error?.stack) {
      logger.error(error.stack);
    }
    return { success: false };
  }
}

/**
 * Find tsup config file in project root
 */
function findTsupConfig(projectRoot: string): string | undefined {
  const configNames = [
    'tsup.config.ts',
    'tsup.config.mts',
    'tsup.config.cts',
    'tsup.config.js',
    'tsup.config.mjs',
    'tsup.config.cjs',
  ];

  for (const name of configNames) {
    const path = join(projectRoot, name);
    if (existsSync(path)) {
      return path;
    }
  }

  return undefined;
}

/**
 * Load and normalize tsup config from file
 */
async function loadTsupConfig(
  configPath: string,
  env: { watch: boolean; format?: string[] }
): Promise<TsupOptions | TsupOptions[] | undefined> {
  try {
    const ext = configPath.split('.').pop();
    let config: TsupConfig;

    // For TypeScript config files, use require()
    // This works because ts-node or tsx is typically configured in the project
    if (ext === 'ts' || ext === 'mts' || ext === 'cts') {
      config = require(configPath);
    } else {
      // For JS files, use dynamic import
      const imported = await import(configPath);
      config = imported.default || imported;
    }

    // Normalize config
    let normalized: TsupOptions | TsupOptions[];

    if (typeof config === 'function') {
      const result = await config({
        watch: env.watch,
        format: env.format,
        mode: process.env.NODE_ENV || 'production',
      });
      normalized = result;
    } else {
      normalized = config;
    }

    return normalized;
  } catch (e: unknown) {
    const error = e as { message?: string };
    logger.warn(
      `Failed to load config from ${configPath}: ${error.message ?? String(e)}`
    );
    return undefined;
  }
}

/**
 * Merge options from config file and project.json
 * project.json takes precedence over config file
 */
async function mergeOptions(params: {
  fromFile: TsupOptions | TsupOptions[] | undefined;
  fromProject: BuildExecutorSchema;
  projectRoot: string;
  root: string;
}): Promise<TsupOptions> {
  const { fromFile, fromProject, projectRoot, root } = params;

  // Start with config from file or empty object
  const base: TsupOptions = Array.isArray(fromFile)
    ? fromFile[0]
    : fromFile || {};

  // Build options from project.json (excluding CLI-only flags)
  const projectOptions: Partial<TsupOptions> = {};

  // Required options
  projectOptions.outDir = resolve(root, fromProject.outDir);
  projectOptions.entry = [resolve(root, fromProject.main)];
  projectOptions.tsconfig = resolve(root, fromProject.tsConfig);

  // Optional boolean/string/array options
  if (fromProject.dts !== undefined) projectOptions.dts = fromProject.dts;
  if (fromProject.clean !== undefined) projectOptions.clean = fromProject.clean;
  if (fromProject.minify !== undefined)
    projectOptions.minify = fromProject.minify;
  if (fromProject.sourcemap !== undefined)
    projectOptions.sourcemap = fromProject.sourcemap;
  if (fromProject.splitting !== undefined)
    projectOptions.splitting = fromProject.splitting;
  if (fromProject.treeshake !== undefined)
    projectOptions.treeshake = fromProject.treeshake;
  if (fromProject.target !== undefined)
    projectOptions.target = fromProject.target;
  if (fromProject.platform !== undefined)
    projectOptions.platform = fromProject.platform;

  // Array options (replace, don't concatenate)
  if (fromProject.external) projectOptions.external = fromProject.external;
  if (fromProject.noExternal)
    projectOptions.noExternal = fromProject.noExternal;
  if (fromProject.inject) projectOptions.inject = fromProject.inject;

  // Object options (deep merge)
  if (fromProject.banner) {
    projectOptions.banner = {
      ...base.banner,
      ...fromProject.banner,
    };
  }
  if (fromProject.footer) {
    projectOptions.footer = {
      ...base.footer,
      ...fromProject.footer,
    };
  }
  if (fromProject.env) {
    projectOptions.env = {
      ...base.env,
      ...fromProject.env,
    };
  }
  if (fromProject.define) {
    projectOptions.define = {
      ...base.define,
      ...fromProject.define,
    };
  }

  // esbuildOptions: compose function to apply project options last
  if (fromProject.esbuildOptions || base.esbuildOptions) {
    const baseEsbuildOptions = base.esbuildOptions;
    const projectEsbuildOptions = fromProject.esbuildOptions || {};

    projectOptions.esbuildOptions = (
      esbuildConfig: Record<string, unknown>
    ) => {
      // Apply base config first if it's a function
      if (typeof baseEsbuildOptions === 'function') {
        baseEsbuildOptions(esbuildConfig);
      } else if (baseEsbuildOptions) {
        Object.assign(esbuildConfig, baseEsbuildOptions);
      }

      // Apply project options (these win)
      Object.assign(esbuildConfig, projectEsbuildOptions);
    };
  }

  // esbuildPlugins: resolve paths and load plugins
  if (fromProject.esbuildPlugins && fromProject.esbuildPlugins.length > 0) {
    const plugins = await Promise.all(
      fromProject.esbuildPlugins.map(async (pluginPath) => {
        const resolvedPath = resolve(projectRoot, pluginPath);
        const imported = await import(resolvedPath);
        return imported.default || imported;
      })
    );

    if (!projectOptions.esbuildOptions) {
      projectOptions.esbuildOptions = (config: Record<string, unknown>) => {
        config.plugins = plugins;
      };
    } else {
      const existingFn = projectOptions.esbuildOptions;
      projectOptions.esbuildOptions = (config: Record<string, unknown>) => {
        existingFn(config);
        const currentPlugins = Array.isArray(config.plugins)
          ? config.plugins
          : [];
        config.plugins = [...currentPlugins, ...plugins];
      };
    }
  }

  // Merge: project options override base
  const merged: TsupOptions = {
    ...base,
    ...projectOptions,
  };

  // Validate outDir is present
  if (!merged.outDir) {
    throw new Error('outDir is required but was not provided');
  }

  return merged;
}

/**
 * Copy assets to output directory
 */
async function copyAssets(root: string, assets: string[], outDir: string) {
  for (const rel of assets) {
    const src = resolve(root, rel);
    const dest = resolve(outDir, rel);
    await fs.mkdir(resolve(dest, '..'), { recursive: true });
    await fs.cp(src, dest, { recursive: true, force: true });
  }
}
