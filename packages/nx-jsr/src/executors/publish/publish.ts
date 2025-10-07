import { ExecutorContext, PromiseExecutor, logger } from '@nx/devkit';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { PublishExecutorSchema } from './schema';
import { config as dotenvConfig } from 'dotenv';

const runExecutor: PromiseExecutor<PublishExecutorSchema> = async (
  options,
  context: ExecutorContext
) => {
  // Infer packageRoot when not provided
  let projectRoot = options.packageRoot;
  const workspaceRoot = context.root;

  if (!projectRoot) {
    try {
      if (
        context.projectName &&
        context.projectsConfigurations?.projects?.[context.projectName]
      ) {
        projectRoot =
          context.projectsConfigurations.projects[context.projectName].root;
        logger.info(`Inferred packageRoot from project config: ${projectRoot}`);
      } else {
        projectRoot = '.';
        logger.info(
          'No project context found; defaulting packageRoot to current directory'
        );
      }
    } catch {
      projectRoot = '.';
      logger.info('Defaulting packageRoot to current directory');
    }
  }

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

  // Load .env (package then workspace) for JSR_TOKEN
  dotenvConfig({ path: join(absolutePackageRoot, '.env') });
  dotenvConfig({ path: join(workspaceRoot, '.env') });

  logger.info(`Publishing package from: ${projectRoot}`);

  const jsrArgs = ['jsr', 'publish'];

  if (options.dryRun) {
    jsrArgs.push('--dry-run');
    logger.info('Running in dry-run mode');
  }

  if (options.allowDirty) {
    jsrArgs.push('--allow-dirty');
  }

  const env = { ...process.env } as NodeJS.ProcessEnv;
  const token = options.token ?? env.JSR_TOKEN;
  if (!options.dryRun && !token) {
    logger.error(
      'Missing JSR token. Provide --token, set JSR_TOKEN env var, or define it in .env'
    );
    return { success: false };
  }
  if (token) env.JSR_TOKEN = token;

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
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to publish package: ${errorMessage}`);
    return { success: false };
  }
};

export default runExecutor;
