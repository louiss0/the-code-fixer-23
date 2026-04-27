import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { ExecutorContext } from '@nx/devkit';

import executor from './publish';
import type { PublishExecutorSchema } from './schema';

describe('Publish Executor', () => {
  let tempDir: string;
  let packageRoot: string;

  beforeEach(() => {
    // Create a temporary workspace root
    tempDir = join(tmpdir(), `nx-jsr-test-${Date.now()}`);
    packageRoot = 'test-package';
    const absolutePackageRoot = join(tempDir, packageRoot);

    // Create the directory structure
    mkdirSync(absolutePackageRoot, { recursive: true });

    // Create a minimal jsr.json file
    const jsrJson = {
      name: '@test/package',
      version: '1.0.0',
      exports: './src/index.ts',
    };
    writeFileSync(
      join(absolutePackageRoot, 'jsr.json'),
      JSON.stringify(jsrJson, null, 2),
    );
  });

  afterEach(() => {
    // Clean up the temporary directory
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should fail gracefully when packageRoot is not provided', async () => {
    const options: PublishExecutorSchema = {};
    const context: ExecutorContext = {
      root: tempDir,
      cwd: process.cwd(),
      isVerbose: false,
      projectGraph: {
        nodes: {},
        dependencies: {},
      },
      projectsConfigurations: {
        projects: {},
        version: 2,
      },
      nxJsonConfiguration: {},
    };

    const output = await executor(options, context);
    expect(output.success).toBe(false);
  });

  it('should fail when package directory does not exist', async () => {
    const options: PublishExecutorSchema = {
      packageRoot: 'non-existent-package',
      dryRun: true,
    };
    const context: ExecutorContext = {
      root: tempDir,
      cwd: process.cwd(),
      isVerbose: false,
      projectGraph: {
        nodes: {},
        dependencies: {},
      },
      projectsConfigurations: {
        projects: {},
        version: 2,
      },
      nxJsonConfiguration: {},
    };

    const output = await executor(options, context);
    expect(output.success).toBe(false);
  });

  it('should fail when jsr.json is missing', async () => {
    const missingJsonPackage = 'missing-jsr-json';
    const absolutePath = join(tempDir, missingJsonPackage);
    mkdirSync(absolutePath, { recursive: true });

    const options: PublishExecutorSchema = {
      packageRoot: missingJsonPackage,
      dryRun: true,
    };
    const context: ExecutorContext = {
      root: tempDir,
      cwd: process.cwd(),
      isVerbose: false,
      projectGraph: {
        nodes: {},
        dependencies: {},
      },
      projectsConfigurations: {
        projects: {},
        version: 2,
      },
      nxJsonConfiguration: {},
    };

    const output = await executor(options, context);
    expect(output.success).toBe(false);
  });
});
