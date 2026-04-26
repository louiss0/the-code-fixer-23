export type Bundler = 'tsup' | 'vite';
export type Formatter = 'prettier' | 'stylistic' | 'biome';
export type Linter = 'eslint' | 'biome';
export type TestRunner = 'vitest' | 'jest';
export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';
export type ProjectFeature = 'extensions' | 'prompts' | 'themes' | 'skills';

export interface CreatePiPackageInput {
  directory?: string;
  bundle?: boolean;
  bundler?: Bundler;
  formatter?: Formatter;
  linter?: Linter;
  testRunner?: TestRunner;
  extensions?: boolean;
  prompts?: boolean;
  themes?: boolean;
  skills?: boolean;
  install?: boolean;
  force?: boolean;
}

export interface CreatePiPackageOptions {
  projectName: string;
  targetDir: string;
  bundle: boolean;
  bundler?: Bundler;
  formatter: Formatter;
  linter: Linter;
  testRunner?: TestRunner;
  features: {
    extensions: boolean;
    prompts: boolean;
    themes: boolean;
    skills: boolean;
  };
  install: boolean;
  force: boolean;
}

export interface CreatePiPackageResult {
  createdFiles: string[];
  overwrittenFiles: string[];
  skippedFiles: string[];
  summaryLines: string[];
}
