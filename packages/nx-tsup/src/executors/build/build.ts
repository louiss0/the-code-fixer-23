import type { ExecutorContext } from '@nx/devkit';
import { logger } from '@nx/devkit';
import { execSync } from 'node:child_process';
import { existsSync, promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import type { BuildExecutorSchema } from './schema';

export default async function runExecutor(
  options: BuildExecutorSchema,
  context: ExecutorContext
): Promise<{ success: boolean }> {
  try {
    const root = context.root || process.cwd();

    if (!options.outputPath || !options.main || !options.tsConfig) {
      logger.error('Missing required options: outputPath, main, tsConfig');
      return { success: false };
    }

    const outDir = resolve(root, options.outputPath);
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

    const tsupBin =
      process.platform === 'win32'
        ? join(root, 'node_modules', '.bin', 'tsup.cmd')
        : join(root, 'node_modules', '.bin', 'tsup');

    const fmt = (options.format && options.format.length ? options.format : ['esm']).join(',');
    const args: string[] = [
      `"${entry}"`,
      `--format=${fmt}`,
      `--out-dir="${outDir}"`,
      `--tsconfig="${tsconfig}"`,
    ];

    if (options.dts ?? true) args.push('--dts');
    if (options.clean ?? true) args.push('--clean');
    if (options.watch) args.push('--watch');
    if (options.minify) args.push('--minify');
    if (options.sourcemap) args.push('--sourcemap');

    const cmd = `"${tsupBin}" ${args.join(' ')}`;
    logger.info(`Running: ${cmd}`);
    execSync(cmd, { stdio: 'inherit', cwd: root });

    if (options.assets?.length) {
      await copyAssets(root, options.assets, outDir);
    }

    logger.info(`Build complete: ${outDir}`);
    return { success: true };
  } catch (e: any) {
    logger.error(e?.message ?? String(e));
    return { success: false };
  }
}

async function copyAssets(root: string, assets: string[], outDir: string) {
  for (const rel of assets) {
    const src = resolve(root, rel);
    const dest = resolve(outDir, rel);
    await fs.mkdir(resolve(dest, '..'), { recursive: true });
    await fs.cp(src, dest, { recursive: true, force: true });
  }
}
