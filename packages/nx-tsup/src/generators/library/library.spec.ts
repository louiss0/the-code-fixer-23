import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree, readProjectConfiguration } from '@nx/devkit';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { libraryGenerator } from './library';
import { LibraryGeneratorSchema } from './schema';

describe('library generator', () => {
  // Mock prompt utils to control interactivity and user choice
  vi.mock('./prompt', () => {
    return {
      isInteractive: () => false, // default non-interactive for deterministic fallbacks
      selectOrDefault: async (
        _q: string,
        _choices: string[],
        defaultChoice: string
      ) => defaultChoice,
    };
  });
  let tree: Tree;
  const options: LibraryGeneratorSchema = {
    name: 'test-lib',
    importPath: '@test/test-lib',
    directory: 'packages',
    description: 'A TypeScript library built with Tsup.',
    skipFormat: true,
  };

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should generate library with default options', async () => {
    await libraryGenerator(tree, options);

    const config = readProjectConfiguration(tree, 'test-lib');
    expect(config).toBeDefined();
    expect(config.root).toBe('packages/test-lib');
    expect(config.projectType).toBe('library');
  });

  it('should create required files', async () => {
    await libraryGenerator(tree, options);

    expect(tree.exists('packages/test-lib/tsconfig.json')).toBe(true);
    expect(tree.exists('packages/test-lib/tsconfig.lib.json')).toBe(true);
    expect(tree.exists('packages/test-lib/package.json')).toBe(true);
    expect(tree.exists('packages/test-lib/tsup.config.ts')).toBe(true);
    expect(tree.exists('packages/test-lib/src/index.ts')).toBe(true);
    expect(tree.exists('packages/test-lib/README.md')).toBe(true);
  });

  it('should configure build target with tsup executor', async () => {
    await libraryGenerator(tree, options);

    const config = readProjectConfiguration(tree, 'test-lib');
    expect(config.targets?.build).toBeDefined();
    expect(config.targets?.build.executor).toBe('@code-fixer-23/nx-tsup:build');
    expect(config.targets?.build.options.format).toEqual(['esm']);
    expect(config.targets?.build.options.dts).toBe(true);
  });

  it('should add test target when testRunner is vitest', async () => {
    await libraryGenerator(tree, { ...options, testRunner: 'vitest' });

    const config = readProjectConfiguration(tree, 'test-lib');
    expect(config.targets?.test).toBeDefined();
    expect(config.targets?.test.executor).toBe('@nx/vite:test');
    expect(tree.exists('packages/test-lib/vitest.config.ts')).toBe(true);
    expect(tree.exists('packages/test-lib/src/index.spec.ts')).toBe(true);
  });

  it('should add test target when testRunner is jest', async () => {
    await libraryGenerator(tree, { ...options, testRunner: 'jest' });

    const config = readProjectConfiguration(tree, 'test-lib');
    expect(config.targets?.test).toBeDefined();
    expect(config.targets?.test.executor).toBe('@nx/jest:jest');
    expect(tree.exists('packages/test-lib/jest.config.ts')).toBe(true);
    expect(tree.exists('packages/test-lib/src/index.spec.ts')).toBe(true);
  });

  it('should not add test target when testRunner is none', async () => {
    await libraryGenerator(tree, { ...options, testRunner: 'none' });

    const config = readProjectConfiguration(tree, 'test-lib');
    expect(config.targets?.test).toBeUndefined();
    expect(tree.exists('packages/test-lib/vitest.config.ts')).toBe(false);
    expect(tree.exists('packages/test-lib/jest.config.ts')).toBe(false);
  });

  it('should add lint target when linter is eslint', async () => {
    await libraryGenerator(tree, { ...options, linter: 'eslint' });

    const config = readProjectConfiguration(tree, 'test-lib');
    expect(config.targets?.lint).toBeDefined();
    expect(config.targets?.lint.executor).toBe('@nx/eslint:lint');
    expect(tree.exists('packages/test-lib/eslint.config.mjs')).toBe(true);
  });

  it('should add lint target when linter is biome', async () => {
    await libraryGenerator(tree, { ...options, linter: 'biome' });

    const config = readProjectConfiguration(tree, 'test-lib');
    expect(config.targets?.lint).toBeDefined();
    expect(tree.exists('packages/test-lib/biome.json')).toBe(true);
  });

  it('should not add lint target when linter is none', async () => {
    await libraryGenerator(tree, { ...options, linter: 'none' });

    const config = readProjectConfiguration(tree, 'test-lib');
    expect(config.targets?.lint).toBeUndefined();
    expect(tree.exists('packages/test-lib/eslint.config.mjs')).toBe(false);
    expect(tree.exists('packages/test-lib/biome.json')).toBe(false);
  });

  it('should always add typecheck target', async () => {
    await libraryGenerator(tree, options);

    const config = readProjectConfiguration(tree, 'test-lib');
    expect(config.targets?.typecheck).toBeDefined();
    expect(config.targets?.typecheck.executor).toBe('@nx/js:tsc');
    expect(config.targets?.typecheck.options.noEmit).toBe(true);
  });

  it('should create package.json with correct metadata', async () => {
    await libraryGenerator(tree, {
      ...options,
      description: 'Test library description',
    });

    const packageJson = JSON.parse(
      tree.read('packages/test-lib/package.json', 'utf-8')!
    );
    expect(packageJson.name).toBe('@test/test-lib');
    expect(packageJson.version).toBe('0.0.0');
    expect(packageJson.type).toBe('module');
    expect(packageJson.main).toBe('./dist/index.js');
    expect(packageJson.types).toBe('./dist/index.d.ts');
  });
  it('auto-detects vitest when only vitest is present and options omitted', async () => {
    // Write root package.json with vitest only
    tree.write(
      'package.json',
      JSON.stringify({ devDependencies: { vitest: '^3.2.4' } }, null, 2)
    );

    await libraryGenerator(tree, { ...options });

    const config = readProjectConfiguration(tree, 'test-lib');
    expect(config.targets?.test?.executor).toBe('@nx/vite:test');
    expect(tree.exists('packages/test-lib/vitest.config.ts')).toBe(true);
  });

  it('auto-detects jest when only jest is present and options omitted', async () => {
    tree.write(
      'package.json',
      JSON.stringify({ devDependencies: { jest: '^29.7.0' } }, null, 2)
    );

    await libraryGenerator(tree, { ...options });

    const config = readProjectConfiguration(tree, 'test-lib');
    expect(config.targets?.test?.executor).toBe('@nx/jest:jest');
    expect(tree.exists('packages/test-lib/jest.config.ts')).toBe(true);
  });

  it('when both jest and vitest are present and non-interactive, falls back to jest', async () => {
    tree.write(
      'package.json',
      JSON.stringify(
        { devDependencies: { jest: '^29.7.0', vitest: '^3.2.4' } },
        null,
        2
      )
    );

    await libraryGenerator(tree, { ...options });

    const config = readProjectConfiguration(tree, 'test-lib');
    expect(config.targets?.test?.executor).toBe('@nx/jest:jest');
  });

  it('auto-detects eslint when only eslint is present and options omitted', async () => {
    tree.write(
      'package.json',
      JSON.stringify({ devDependencies: { eslint: '^9.37.0' } }, null, 2)
    );

    await libraryGenerator(tree, { ...options });

    const config = readProjectConfiguration(tree, 'test-lib');
    expect(config.targets?.lint?.executor).toBe('@nx/eslint:lint');
    expect(tree.exists('packages/test-lib/eslint.config.mjs')).toBe(true);
  });

  it('when both eslint and biome are present and non-interactive, falls back to eslint', async () => {
    tree.write(
      'package.json',
      JSON.stringify(
        { devDependencies: { eslint: '^9.37.0', '@biomejs/biome': '^1.9.4' } },
        null,
        2
      )
    );

    await libraryGenerator(tree, { ...options });

    const config = readProjectConfiguration(tree, 'test-lib');
    expect(config.targets?.lint?.executor).toBe('@nx/eslint:lint');
  });
});
