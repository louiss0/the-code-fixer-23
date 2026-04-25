export type PiPackageMode = 'source' | 'bundle';
export type ToolingPreset = 'eslint-prettier' | 'biome';
export type TestRunner = 'vitest' | 'jest';

export interface CreatePiPackageOptions {
  directory?: string;
  force?: boolean;
  mode?: PiPackageMode;
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

export interface TemplateContext {
  mode: PiPackageMode;
  packageName: string;
  scopedPackageName: string;
  testRunner: TestRunner;
  tooling: ToolingPreset;
}

export interface SelectChoiceOptions<TChoice extends string> {
  choices: readonly TChoice[];
  defaultChoice: TChoice;
  label: string;
}
