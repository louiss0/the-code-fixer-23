import type { Tree } from "@nx/devkit";
import {
  formatFiles,
  getProjects,
  logger,
  updateProjectConfiguration,
} from "@nx/devkit";

/**
 * Migration to rename 'outputPath' to 'outDir' in all nx-tsup build targets
 * This is a breaking change in v0.1.0 to align with tsup's native naming
 */
export default async function renameOutputPathToOutDir(tree: Tree) {
  const projects = getProjects(tree);
  let modifiedCount = 0;
  const modifiedProjects: string[] = [];

  for (const [projectName, projectConfig] of projects.entries()) {
    let modified = false;

    if (!projectConfig.targets) {
      continue;
    }

    for (const [targetName, targetConfig] of Object.entries(
      projectConfig.targets,
    )) {
      // Check if this target uses the nx-tsup build executor
      if (
        targetConfig.executor === "@code-fixer-23/nx-tsup:build" &&
        targetConfig.options
      ) {
        // Check if outputPath exists
        if ("outputPath" in targetConfig.options) {
          const outputPath = targetConfig.options.outputPath;

          // Rename outputPath to outDir
          targetConfig.options.outDir = outputPath;
          delete targetConfig.options.outputPath;

          modified = true;
          logger.info(
            `  ✓ ${projectName}:${targetName} - renamed outputPath to outDir`,
          );
        }
      }
    }

    if (modified) {
      updateProjectConfiguration(tree, projectName, projectConfig);
      modifiedCount++;
      modifiedProjects.push(projectName);
    }
  }

  if (modifiedCount > 0) {
    logger.info("");
    logger.info("✓ Migration complete!");
    logger.info(`  Modified ${modifiedCount} project(s):`);
    modifiedProjects.forEach((name) => {
      logger.info(`    - ${name}`);
    });
    logger.info("");

    await formatFiles(tree);
  } else {
    logger.info("");
    logger.info("✓ No projects found using outputPath - migration skipped");
    logger.info("");
  }
}
