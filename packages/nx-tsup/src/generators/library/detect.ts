import { Tree } from '@nx/devkit';

export type DetectedTestRunner = 'jest' | 'vitest';
export type DetectedLinter = 'eslint' | 'biome';

function readRootPackageJson(tree: Tree): Record<string, any> | null {
  try {
    const raw = tree.read('package.json', 'utf-8');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function hasDep(pkg: any, name: string): boolean {
  const deps = pkg?.dependencies ?? {};
  const devDeps = pkg?.devDependencies ?? {};
  return Boolean(deps[name] || devDeps[name]);
}

export function detectTestRunnerFromRootPackageJson(tree: Tree): {
  detected: DetectedTestRunner | null;
  candidates: DetectedTestRunner[];
} {
  const pkg = readRootPackageJson(tree) ?? {};
  const candidates: DetectedTestRunner[] = [];
  if (hasDep(pkg, 'jest')) candidates.push('jest');
  if (hasDep(pkg, 'vitest')) candidates.push('vitest');

  if (candidates.length === 1) {
    return { detected: candidates[0], candidates };
  }
  return { detected: null, candidates };
}

export function detectLinterFromRootPackageJson(tree: Tree): {
  detected: DetectedLinter | null;
  candidates: DetectedLinter[];
} {
  const pkg = readRootPackageJson(tree) ?? {};
  const candidates: DetectedLinter[] = [];
  if (hasDep(pkg, 'eslint')) candidates.push('eslint');
  if (hasDep(pkg, '@biomejs/biome')) candidates.push('biome');

  if (candidates.length === 1) {
    return { detected: candidates[0], candidates };
  }
  return { detected: null, candidates };
}
