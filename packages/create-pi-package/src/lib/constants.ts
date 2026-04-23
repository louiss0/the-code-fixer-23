export const defaultScope = '@pi-packages';

export const managedFilePaths = [
  '.gitignore',
  'README.md',
  'LICENSE',
  'package.json',
  'pi-package.json',
  'tsconfig.json',
  'lib/index.ts',
  'extensions/weather-tools/package.json',
  'extensions/weather-tools/README.md',
  'skills/weather-brief/SKILL.md',
  'prompts/weather-report.md',
  'test/load-pi-package.test.ts',
  'vitest.config.ts',
  'jest.config.ts',
  'eslint.config.mjs',
  '.prettierrc.json',
  '.prettierignore',
  'biome.json',
  'tsup.config.ts',
  'scripts/prepare-dist.mjs'
] as const;

export const defaultChoices = {
  mode: 'source',
  testRunner: 'vitest',
  tooling: 'eslint-prettier'
} as const;

export const packageKeywords = [
  'pi',
  'pi-package',
  'prompts',
  'skills',
  'extensions'
] as const;
