import { ExecutorContext, PromiseExecutor, logger } from '@nx/devkit';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { PublishExecutorSchema } from './schema';

const runExecutor: PromiseExecutor<PublishExecutorSchema> = async (
  options,
  context: ExecutorContext
) => {
  const projectRoot = options.packageRoot;
  const workspaceRoot = context.root;
  const absolutePackageRoot = join(workspaceRoot, projectRoot);

  if (!existsSync(absolutePackageRoot)) {
    logger.error(
      `Package root directory does not exist: ${absolutePackageRoot}`
    );
    return { success: false };
  }

  const jsrJsonPath = join(absolutePackageRoot, 'jsr.json');
  if (!existsSync(jsrJsonPath)) {
    logger.error(
      `jsr.json not found in ${absolutePackageRoot}. This is required for JSR publishing.`
    );
    return { success: false };
  }

  logger.info(`Publishing package from: ${projectRoot}`);

  const jsrArgs = ['jsr', 'publish'];

  if (options.dryRun) {
    jsrArgs.push('--dry-run');
    logger.info('Running in dry-run mode');
  }

  if (options.allowDirty) {
    jsrArgs.push('--allow-dirty');
  }

  const env = { ...process.env };
  if (options.token) {
    env.JSR_TOKEN = options.token;
  }

  try {
    logger.info(`Executing: npx ${jsrArgs.join(' ')}`);

    execSync(`npx ${jsrArgs.join(' ')}`, {
      cwd: absolutePackageRoot,
      stdio: 'inherit',
      env,
    });

    logger.info(
      `Successfully ${options.dryRun ? 'validated' : 'published'} package`
    );
    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    logger.error(`Failed to publish package: ${errorMessage}`);
    return { success: false };
  }
};

export default runExecutor;
