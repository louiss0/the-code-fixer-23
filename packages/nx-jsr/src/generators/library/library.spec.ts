import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree, readProjectConfiguration } from '@nx/devkit';

import { libraryGenerator } from './library';
import { LibraryGeneratorSchema } from './schema';

describe('library generator', () => {
  let tree: Tree;
  const options: LibraryGeneratorSchema = {
    name: 'test',
    importPath: '@scope/test',
  };

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should generate in standalone mode by default (current directory)', async () => {
    await libraryGenerator(tree, options);
    // Standalone: no Nx project should be registered
    expect(() => readProjectConfiguration(tree, 'test')).toThrow();
    // Files should exist in current directory
    expect(tree.exists('jsr.json')).toBe(true);
    expect(tree.exists('src/index.ts')).toBe(true);
  });

  it('should generate in subdirectory with project name when directory is specified', async () => {
    await libraryGenerator(tree, { ...options, directory: 'packages' });
    const config = readProjectConfiguration(tree, 'test');
    expect(config).toBeDefined();
    expect(config.root).toBe('packages/test');
    expect(tree.exists('packages/test/jsr.json')).toBe(true);
    expect(tree.exists('packages/test/src/index.ts')).toBe(true);
  });

  it('should use nx:run-commands for biome lint targets', async () => {
    await libraryGenerator(tree, {
      ...options,
      directory: 'packages',
      linter: 'biome',
      formatter: 'none',
    });

    const config = readProjectConfiguration(tree, 'test');

    expect(config.targets?.lint).toMatchObject({
      executor: 'nx:run-commands',
      options: {
        commands: ['biome lint packages/test'],
      },
    });
  });

  it('should use nx:run-commands for formatter targets', async () => {
    await libraryGenerator(tree, {
      ...options,
      directory: 'packages',
      linter: 'eslint',
      formatter: 'prettier',
    });

    const config = readProjectConfiguration(tree, 'test');

    expect(config.targets?.format).toMatchObject({
      executor: 'nx:run-commands',
      options: {
        commands: ['prettier --write packages/test'],
      },
    });
  });

  it('should treat directory="." as standalone mode', async () => {
    await libraryGenerator(tree, { ...options, directory: '.' });
    // Standalone: no Nx project should be registered
    expect(() => readProjectConfiguration(tree, 'test')).toThrow();
    expect(tree.exists('jsr.json')).toBe(true);
    expect(tree.exists('src/index.ts')).toBe(true);
  });
});
