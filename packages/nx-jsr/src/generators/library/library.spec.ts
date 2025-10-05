import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree, readProjectConfiguration } from '@nx/devkit';

import { libraryGenerator } from './library';
import { LibraryGeneratorSchema } from './schema';

describe('library generator', () => {
  let tree: Tree;
  const options: LibraryGeneratorSchema = { 
    name: 'test',
    importPath: '@scope/test'
  };

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should generate at root level by default', async () => {
    await libraryGenerator(tree, options);
    const config = readProjectConfiguration(tree, 'test');
    expect(config).toBeDefined();
    expect(config.root).toBe('test');
    expect(tree.exists('test/jsr.json')).toBe(true);
    expect(tree.exists('test/src/index.ts')).toBe(true);
  });

  it('should generate in packages directory when specified', async () => {
    await libraryGenerator(tree, { ...options, directory: 'packages' });
    const config = readProjectConfiguration(tree, 'test');
    expect(config).toBeDefined();
    expect(config.root).toBe('packages/test');
    expect(tree.exists('packages/test/jsr.json')).toBe(true);
  });
});
