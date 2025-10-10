import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree } from '@nx/devkit';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectTestRunnerFromRootPackageJson,
  detectLinterFromRootPackageJson,
} from './detect';

function writeRootPkg(tree: Tree, pkg: Record<string, unknown>) {
  tree.write('package.json', JSON.stringify(pkg, null, 2));
}

describe('detect utilities', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  describe('test runner detection', () => {
    it('detects jest only', () => {
      writeRootPkg(tree, { devDependencies: { jest: '^29.7.0' } });
      const res = detectTestRunnerFromRootPackageJson(tree);
      expect(res.detected).toBe('jest');
      expect(res.candidates).toEqual(['jest']);
    });

    it('detects vitest only', () => {
      writeRootPkg(tree, { devDependencies: { vitest: '^3.2.4' } });
      const res = detectTestRunnerFromRootPackageJson(tree);
      expect(res.detected).toBe('vitest');
      expect(res.candidates).toEqual(['vitest']);
    });

    it('detects none', () => {
      writeRootPkg(tree, { devDependencies: {} });
      const res = detectTestRunnerFromRootPackageJson(tree);
      expect(res.detected).toBeNull();
      expect(res.candidates).toEqual([]);
    });

    it('detects both jest and vitest', () => {
      writeRootPkg(tree, {
        devDependencies: { jest: '^29.7.0', vitest: '^3.2.4' },
      });
      const res = detectTestRunnerFromRootPackageJson(tree);
      expect(res.detected).toBeNull();
      expect(res.candidates.sort()).toEqual(['jest', 'vitest']);
    });
  });

  describe('linter detection', () => {
    it('detects eslint only', () => {
      writeRootPkg(tree, { devDependencies: { eslint: '^9.37.0' } });
      const res = detectLinterFromRootPackageJson(tree);
      expect(res.detected).toBe('eslint');
      expect(res.candidates).toEqual(['eslint']);
    });

    it('detects biome only', () => {
      writeRootPkg(tree, { devDependencies: { '@biomejs/biome': '^1.9.4' } });
      const res = detectLinterFromRootPackageJson(tree);
      expect(res.detected).toBe('biome');
      expect(res.candidates).toEqual(['biome']);
    });

    it('detects none', () => {
      writeRootPkg(tree, { devDependencies: {} });
      const res = detectLinterFromRootPackageJson(tree);
      expect(res.detected).toBeNull();
      expect(res.candidates).toEqual([]);
    });

    it('detects both eslint and biome', () => {
      writeRootPkg(tree, {
        devDependencies: { eslint: '^9.37.0', '@biomejs/biome': '^1.9.4' },
      });
      const res = detectLinterFromRootPackageJson(tree);
      expect(res.detected).toBeNull();
      expect(res.candidates.sort()).toEqual(['biome', 'eslint']);
    });
  });
});
