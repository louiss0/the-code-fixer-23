import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import {
  type ExecutorContext,
  type PromiseExecutor,
  detectPackageManager,
  getPackageManagerCommand,
  logger,
} from "@nx/devkit";
import { config as dotenvConfig } from "dotenv";

interface ValidateSchema {
  packageRoot?: string;
  dryRun?: boolean;
}

interface JsrConfigShape {
  name?: unknown;
  version?: unknown;
  exports?: unknown;
}

const runExecutor: PromiseExecutor<ValidateSchema> = async (
  options,
  context: ExecutorContext,
) => {
  // Infer package root similar to publish executor
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
        projectRoot = ".";
        logger.info(
          "No project context found; defaulting packageRoot to current directory",
        );
      }
    } catch {
      projectRoot = ".";
      logger.info("Defaulting packageRoot to current directory");
    }
  }

  const absolutePackageRoot = join(workspaceRoot, projectRoot);
  if (!existsSync(absolutePackageRoot)) {
    logger.error(
      `Package root directory does not exist: ${absolutePackageRoot}`,
    );
    return { success: false };
  }

  // Load .env for token resolution, though not strictly required for dry-run
  dotenvConfig({ path: join(absolutePackageRoot, ".env") });
  dotenvConfig({ path: join(workspaceRoot, ".env") });

  const jsrJsonPath = join(absolutePackageRoot, "jsr.json");
  if (!existsSync(jsrJsonPath)) {
    logger.error(`jsr.json not found in ${absolutePackageRoot}`);
    return { success: false };
  }

  // Basic jsr.json shape validation
  try {
    const cfg: JsrConfigShape = JSON.parse(readFileSync(jsrJsonPath, "utf-8"));
    if (typeof cfg.name !== "string" || !cfg.name.trim()) {
      logger.error('Invalid jsr.json: "name" must be a non-empty string');
      return { success: false };
    }
    if (typeof cfg.version !== "string" || !cfg.version.trim()) {
      logger.error('Invalid jsr.json: "version" must be a non-empty string');
      return { success: false };
    }
    if (
      cfg.exports === undefined ||
      (typeof cfg.exports !== "string" && typeof cfg.exports !== "object")
    ) {
      logger.error('Invalid jsr.json: "exports" must be a string or an object');
      return { success: false };
    }
  } catch (e) {
    logger.error(`Failed parsing jsr.json: ${(e as Error).message}`);
    return { success: false };
  }

  // Validate tsconfig.lib.json declaration
  const tsconfigLibPath = join(absolutePackageRoot, "tsconfig.lib.json");
  if (existsSync(tsconfigLibPath)) {
    try {
      const ts = JSON.parse(readFileSync(tsconfigLibPath, "utf-8"));
      const decl = ts?.compilerOptions?.declaration;
      if (decl !== true) {
        logger.error(
          "tsconfig.lib.json must set compilerOptions.declaration: true for JSR libraries",
        );
        return { success: false };
      }
    } catch (e) {
      logger.error(`Failed parsing tsconfig.lib.json: ${(e as Error).message}`);
      return { success: false };
    }
  } else {
    logger.info("No tsconfig.lib.json found; skipping declaration check");
  }

  // Always dry-run publish
  try {
    const packageManagerCommands = getPackageManagerCommand(
      detectPackageManager(workspaceRoot),
    );
    const command = `${packageManagerCommands.exec} jsr publish --dry-run`;
    logger.info(`Running: ${command}`);
    execSync(command, {
      cwd: absolutePackageRoot,
      stdio: "inherit",
      env: process.env,
    });
    logger.info("✓ JSR dry-run publish completed successfully");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error(`JSR dry-run publish failed: ${msg}`);
    return { success: false };
  }
};

export default runExecutor;
