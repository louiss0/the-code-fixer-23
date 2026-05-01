export type TestRunner = 'vitest' | 'jest' | 'none';
export type Linter = 'eslint' | 'biome' | 'none';
export type Formatter = 'prettier' | 'biome' | 'eslint-stylistic' | 'none';

export interface LibraryGeneratorSchema {
  name: string;
  directory?: string;
  scope?: string;
  importPath?: string;
  description?: string;
  skipFormat?: boolean;
  skipInstall?: boolean;
  testRunner?: TestRunner;
  linter?: Linter;
  formatter?: Formatter;
}
