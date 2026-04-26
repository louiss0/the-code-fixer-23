export type ToolingPreset = 'eslint-prettier' | 'biome';
export type TestRunner = 'vitest' | 'jest';
export type PackageMode = 'source' | 'bundle';

export interface CreatePiPackageOptions {
  directory?: string;
  force?: boolean;
  mode?: PackageMode;
  name?: string;
  testRunner?: TestRunner;
  tooling?: ToolingPreset;
  yes?: boolean;
}

export interface CreatePiPackageResult {
  createdFiles: string[];
  overwrittenFiles: string[];
  skippedFiles: string[];
  summaryLines: string[];
}
