import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { logger } from '@nx/devkit';
import * as semver from 'semver';
const runExecutor = async (options, context) => {
    const projectRoot = options.packageRoot;
    if (!projectRoot) {
        logger.error('packageRoot option is required');
        return { success: false };
    }
    if (!options.version) {
        logger.error('version option is required (e.g., 1.2.3)');
        return { success: false };
    }
    if (!semver.valid(options.version)) {
        logger.error(`Invalid version format: ${options.version}`);
        return { success: false };
    }
    const workspaceRoot = context.root;
    const absolutePackageRoot = join(workspaceRoot, projectRoot);
    if (!existsSync(absolutePackageRoot)) {
        logger.error(`Package root directory does not exist: ${absolutePackageRoot}`);
        return { success: false };
    }
    const jsrJsonPath = join(absolutePackageRoot, 'jsr.json');
    if (!existsSync(jsrJsonPath)) {
        logger.error(`jsr.json not found in ${absolutePackageRoot}. This is required for versioning.`);
        return { success: false };
    }
    // Read current jsr.json
    const jsrConfig = JSON.parse(readFileSync(jsrJsonPath, 'utf-8'));
    const currentVersion = jsrConfig.version;
    if (!currentVersion || !semver.valid(currentVersion)) {
        logger.error(`Invalid or missing current version in jsr.json: ${currentVersion}`);
        return { success: false };
    }
    const newVersion = options.version;
    logger.info(`Manual version update: ${currentVersion} → ${newVersion}`);
    // Update jsr.json
    jsrConfig.version = newVersion;
    writeFileSync(jsrJsonPath, JSON.stringify(jsrConfig, null, 2) + '\n');
    logger.info(`✓ Updated ${jsrJsonPath} to version ${newVersion}`);
    if (options.push) {
        try {
            // Ensure working tree is clean (no auto-commit here)
            const status = execSync('git status --porcelain', {
                cwd: workspaceRoot,
                encoding: 'utf-8',
            }).trim();
            if (status) {
                logger.error('Working tree has uncommitted changes. Commit changes before tagging/pushing.');
                logger.info('Hint: commit jsr.json and try again without --push, or tag manually.');
                return { success: false };
            }
            const tagName = `${options.tagPrefix || 'v'}${newVersion}`;
            execSync(`git tag ${tagName}`, { cwd: workspaceRoot, stdio: 'inherit' });
            execSync('git push --tags', { cwd: workspaceRoot, stdio: 'inherit' });
            logger.info(`✓ Created and pushed tag ${tagName}`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`Failed to create/push tag: ${errorMessage}`);
            return { success: false };
        }
    }
    else {
        logger.info('');
        logger.info('📝 Next steps:');
        logger.info('  1. Review the version change in jsr.json');
        logger.info(`  2. Commit the change: git add ${projectRoot}/jsr.json && git commit -m "chore(release): ${newVersion}"`);
        logger.info(`  3. Create a git tag: git tag ${options.tagPrefix || 'v'}${newVersion}`);
        logger.info('  4. Push to GitHub: git push && git push --tags');
    }
    return { success: true };
};
export default runExecutor;
