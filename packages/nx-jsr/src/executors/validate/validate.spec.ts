import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { ExecutorContext } from '@nx/devkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock child_process.execSync globally to avoid invoking external commands
vi.mock('child_process', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    execSync: vi.fn(() => Buffer.from('')),
  };
});

import executor from './validate';

function makeContext(root: string): ExecutorContext {
  return {
    root,
    cwd: process.cwd(),
    isVerbose: false,
    projectGraph: { nodes: {}, dependencies: {} },
    projectsConfigurations: { projects: {}, version: 2 },
    nxJsonConfiguration: {},
  } as unknown as ExecutorContext;
}

describe('Validate Executor', () => {
  let tempDir: string;
  let packageRoot: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `nx-jsr-validate-test-${Date.now()}`);
    packageRoot = 'test-package';
  });

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('fails when package directory does not exist', async () => {
    const ctx = makeContext(tempDir);
    const output = await executor(
      { packageRoot: 'does-not-exist', dryRun: true },
      ctx,
    );
    expect(output.success).toBe(false);
  });

  it('fails when jsr.json is missing', async () => {
    const ctx = makeContext(tempDir);
    const absolute = join(tempDir, packageRoot);
    mkdirSync(absolute, { recursive: true });

    const output = await executor({ packageRoot }, ctx);
    expect(output.success).toBe(false);
  });

  it('fails when jsr.json has invalid shape (missing name)', async () => {
    const ctx = makeContext(tempDir);
    const absolute = join(tempDir, packageRoot);
    mkdirSync(absolute, { recursive: true });

    writeFileSync(
      join(absolute, 'jsr.json'),
      JSON.stringify({ version: '1.0.0', exports: './src/index.ts' }, null, 2),
    );

    const output = await executor({ packageRoot }, ctx);
    expect(output.success).toBe(false);
  });

  it('fails when tsconfig.lib.json exists without declaration:true', async () => {
    const ctx = makeContext(tempDir);
    const absolute = join(tempDir, packageRoot);
    mkdirSync(absolute, { recursive: true });

    writeFileSync(
      join(absolute, 'jsr.json'),
      JSON.stringify(
        { name: '@test/pkg', version: '1.0.0', exports: './src/index.ts' },
        null,
        2,
      ),
    );
    writeFileSync(
      join(absolute, 'tsconfig.lib.json'),
      JSON.stringify({ compilerOptions: { declaration: false } }, null, 2),
    );

    const output = await executor({ packageRoot }, ctx);
    expect(output.success).toBe(false);
  });

  it.skip('succeeds in dry-run with valid jsr.json and declaration:true (exec mocked)', async () => {
    const ctx = makeContext(tempDir);
    const absolute = join(tempDir, packageRoot);
    mkdirSync(absolute, { recursive: true });

    writeFileSync(
      join(absolute, 'jsr.json'),
      JSON.stringify(
        { name: '@test/pkg', version: '1.0.0', exports: './src/index.ts' },
        null,
        2,
      ),
    );
    writeFileSync(
      join(absolute, 'tsconfig.lib.json'),
      JSON.stringify({ compilerOptions: { declaration: true } }, null, 2),
    );

    const output = await executor({ packageRoot, dryRun: true }, ctx);
    expect(output.success).toBe(true);
  });
});
