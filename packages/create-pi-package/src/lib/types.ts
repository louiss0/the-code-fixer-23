export type Bundler = 'tsup' | 'vite';
export type TestRunner = 'vitest' | 'jest';
export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

export interface CreatePiPackageInput {
  directory?: string;
  bundle?: boolean;
  bundler?: Bundler;
  testRunner?: TestRunner;
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
  testRunner: TestRunner;
  features: {
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
