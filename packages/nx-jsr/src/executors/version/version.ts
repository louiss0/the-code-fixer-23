import { ExecutorContext, PromiseExecutor, logger } from '@nx/devkit';
import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import * as semver from 'semver';
import { VersionExecutorSchema, ReleaseType } from './schema';

interface JsrConfig {
  name: string;
  version: string;
  [key: string]: unknown;
}

interface ConventionalCommit {
  type: string;
  breaking: boolean;
}

const runExecutor: PromiseExecutor<VersionExecutorSchema> = async (
  options,
  context: ExecutorContext
) => {
  const projectRoot = options.packageRoot;
  if (!projectRoot) {
    logger.error('packageRoot option is required');
    return { success: false };
  }

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
      `jsr.json not found in ${absolutePackageRoot}. This is required for versioning.`
    );
    return { success: false };
  }

  // Read current jsr.json
  const jsrConfig: JsrConfig = JSON.parse(readFileSync(jsrJsonPath, 'utf-8'));
  const currentVersion = jsrConfig.version;

  if (!currentVersion) {
    logger.error('No version field found in jsr.json');
    return { success: false };
  }

  if (!semver.valid(currentVersion)) {
    logger.error(`Invalid version in jsr.json: ${currentVersion}`);
    return { success: false };
  }

  const mode = options.mode || 'auto';
  let newVersion: string | null = null;

  if (mode === 'manual') {
    if (!options.version) {
      logger.error('version option is required in manual mode');
      return { success: false };
    }

    if (!semver.valid(options.version)) {
      logger.error(`Invalid version format: ${options.version}`);
      return { success: false };
    }

    newVersion = options.version;
    logger.info(`Manual version update: ${currentVersion} → ${newVersion}`);
  } else {
    // Auto mode: analyze conventional commits
    const releaseType =
      options.releaseAs ||
      determineReleaseType(workspaceRoot, options.tagPrefix || 'v');

    if (!releaseType) {
      logger.info('No version-bumping commits found since last release');
      return { success: true };
    }

    if (options.preid) {
      newVersion =
        semver.inc(currentVersion, releaseType, options.preid) || null;
    } else {
      newVersion = semver.inc(currentVersion, releaseType) || null;
    }

    if (!newVersion) {
      logger.error(
        `Failed to calculate new version from ${currentVersion} with release type ${releaseType}`
      );
      return { success: false };
    }

    logger.info(
      `Auto version update (${releaseType}): ${currentVersion} → ${newVersion}`
    );
  }

  // Update jsr.json
  jsrConfig.version = newVersion;
  writeFileSync(jsrJsonPath, JSON.stringify(jsrConfig, null, 2) + '\n');
  logger.info(`✓ Updated ${jsrJsonPath} to version ${newVersion}`);

  // Optionally push to GitHub
  if (options.push) {
    try {
      const tagName = `${options.tagPrefix || 'v'}${newVersion}`;
      execSync(`git add ${jsrJsonPath}`, { cwd: absolutePackageRoot });
      execSync(`git commit -m "chore(release): ${newVersion}"`, {
        cwd: workspaceRoot,
      });
      execSync(`git tag ${tagName}`, { cwd: workspaceRoot });
      execSync(`git push && git push --tags`, {
        cwd: workspaceRoot,
        stdio: 'inherit',
      });
      logger.info(`✓ Pushed changes and tag ${tagName} to GitHub`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Failed to push to GitHub: ${errorMessage}`);
      return { success: false };
    }
  } else {
    logger.info('');
    logger.info('📝 Next steps:');
    logger.info('  1. Review the version change in jsr.json');
    logger.info(`  2. Commit the changes: git add ${projectRoot}/jsr.json`);
    logger.info(
      `  3. Create a git tag: git tag ${options.tagPrefix || 'v'}${newVersion}`
    );
    logger.info('  4. Push to GitHub: git push && git push --tags');
  }

  return { success: true };
};

function determineReleaseType(
  workspaceRoot: string,
  tagPrefix: string
): ReleaseType | null {
  try {
    // Get the last tag
    const lastTag = execSync(
      `git describe --tags --abbrev=0 --match="${tagPrefix}*" 2>nul`,
      {
        cwd: workspaceRoot,
        encoding: 'utf-8',
      }
    ).trim();

    // Get commits since last tag
    const commits = execSync(
      `git log ${lastTag}..HEAD --format=%B%n-hash-%n%H%n-END-`,
      {
        cwd: workspaceRoot,
        encoding: 'utf-8',
      }
    ).trim();

    if (!commits) {
      logger.info('No commits found since last tag');
      return null;
    }

    // Parse conventional commits using regex
    const conventionalCommitRegex = /^(\w+)(\(([^)]+)\))?(!)?:\s*(.+)/m;
    const parsedCommits: ConventionalCommit[] = commits
      .split('-END-')
      .filter((commit) => commit.trim())
      .map((commit) => {
        const match = commit.match(conventionalCommitRegex);
        const type = match ? match[1] : '';
        const hasBreakingInHeader = match ? !!match[4] : false;
        const hasBreakingInBody = /BREAKING CHANGE:/i.test(commit);

        return {
          type,
          breaking: hasBreakingInHeader || hasBreakingInBody,
        };
      });

    // Determine bump type
    const hasBreaking = parsedCommits.some((c) => c.breaking);
    const hasFeat = parsedCommits.some((c) => c.type === 'feat');
    const hasFix = parsedCommits.some((c) => c.type === 'fix');

    if (hasBreaking) {
      logger.info('Breaking changes detected');
      return 'major';
    } else if (hasFeat) {
      logger.info('New features detected');
      return 'minor';
    } else if (hasFix) {
      logger.info('Bug fixes detected');
      return 'patch';
    }

    return null;
  } catch (error) {
    // No tags yet, default to patch
    logger.info('No previous tags found, defaulting to patch bump');
    return 'patch';
  }
}

export default runExecutor;
