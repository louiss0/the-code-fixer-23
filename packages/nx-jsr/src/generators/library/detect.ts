import { Tree } from '@nx/devkit';

export type DetectedTestRunner = 'jest' | 'vitest';
export type DetectedLinter = 'eslint' | 'biome';
export type DetectedFormatter = 'prettier' | 'biome' | 'eslint-stylistic';

function readRootPackageJson(tree: Tree): Record<string, unknown> | null {
  try {
    const raw = tree.read('package.json', 'utf-8');
    if (!raw) return null;
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function hasDep(pkg: Record<string, unknown>, name: string): boolean {
  const deps = (pkg?.dependencies as Record<string, string>) ?? {};
  const devDeps = (pkg?.devDependencies as Record<string, string>) ?? {};
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

export function detectFormatterFromRootPackageJson(tree: Tree): {
  detected: DetectedFormatter | null;
  candidates: DetectedFormatter[];
} {
  const pkg = readRootPackageJson(tree) ?? {};
  const candidates: DetectedFormatter[] = [];
  if (hasDep(pkg, 'prettier')) candidates.push('prettier');
  if (hasDep(pkg, '@biomejs/biome')) candidates.push('biome');
  if (hasDep(pkg, '@stylistic/eslint-plugin'))
    candidates.push('eslint-stylistic');

  if (candidates.length === 1) {
    return { detected: candidates[0], candidates };
  }
  return { detected: null, candidates };
}
