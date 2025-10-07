import { ExecutorContext } from '@nx/devkit';
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { VersionExecutorSchema } from './schema';
import executor from './version';

describe('Version Executor', () => {
  let tempDir: string;
  let packageRoot: string;

  beforeEach(() => {
    // Create a temporary workspace root
    tempDir = join(tmpdir(), `nx-jsr-version-test-${Date.now()}`);
    packageRoot = 'test-package';
    const absolutePackageRoot = join(tempDir, packageRoot);

    // Create the directory structure
    mkdirSync(absolutePackageRoot, { recursive: true });

    // Create a minimal jsr.json file with a version
    const jsrJson = {
      name: '@test/package',
      version: '1.0.0',
      exports: './src/index.ts',
    };
    writeFileSync(
      join(absolutePackageRoot, 'jsr.json'),
      JSON.stringify(jsrJson, null, 2)
    );
  });

  afterEach(() => {
    // Clean up the temporary directory
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should fail when packageRoot is not provided', async () => {
    const options: VersionExecutorSchema = {} as VersionExecutorSchema;
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
    const options: VersionExecutorSchema = {
      packageRoot: 'non-existent-package',
      version: '1.0.1',
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

    const options: VersionExecutorSchema = {
      packageRoot: missingJsonPackage,
      version: '1.0.1',
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

  it('should update version manually', async () => {
    const options: VersionExecutorSchema = {
      packageRoot,
      version: '2.0.0',
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
    expect(output.success).toBe(true);

    // Verify version was updated
    const jsrJsonPath = join(tempDir, packageRoot, 'jsr.json');
    const jsrConfig = JSON.parse(readFileSync(jsrJsonPath, 'utf-8'));
    expect(jsrConfig.version).toBe('2.0.0');
  });

  it('should fail manual update with invalid version', async () => {
    const options: VersionExecutorSchema = {
      packageRoot,
      version: 'invalid-version',
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

  it('should fail without version option', async () => {
    const options: VersionExecutorSchema = {
      packageRoot,
    } as VersionExecutorSchema;
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
