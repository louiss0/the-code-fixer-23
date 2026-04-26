import fs from 'fs-extra';
import path from 'node:path';

import {
  createAgentsMd,
  createClaudeMd,
  createExtensionFile,
  createExtensionScript,
  createGitignore,
  createIndexFile,
  createJestConfig,
  createPackageJson,
  createPromptFile,
  createPromptScript,
  createPromptsIndexFile,
  createReadme,
  createSkillFile,
  createSkillScript,
  createTestFile,
  createThemeFile,
  createThemeScript,
  createThemesIndexFile,
  createTsConfig,
  createTsupConfig,
  createViteConfig,
  createVitestConfig,
} from './templates';
import type { CreatePiPackageOptions } from './types';

export async function writeProjectFiles(options: CreatePiPackageOptions) {
  const files = getProjectFiles(options);
  const createdFiles: string[] = [];
  const overwrittenFiles: string[] = [];
  const skippedFiles: string[] = [];

  for (const [filePath, content] of files) {
    const targetPath = path.join(options.targetDir, filePath);
    const exists = await fs.pathExists(targetPath);

    if (exists && !options.force) {
      skippedFiles.push(filePath);
      continue;
    }

    await fs.outputFile(targetPath, content);

    if (exists) {
      overwrittenFiles.push(filePath);
    } else {
      createdFiles.push(filePath);
    }
  }

  return { createdFiles, overwrittenFiles, skippedFiles };
}

function getProjectFiles(options: CreatePiPackageOptions) {
  const files = new Map<string, string>([
    ['package.json', createPackageJson(options)],
    ['README.md', createReadme(options)],
    ['AGENTS.md', createAgentsMd()],
    ['CLAUDE.md', createClaudeMd()],
    ['.gitignore', createGitignore()],
    ['tsconfig.json', createTsConfig()],
    ['src/index.ts', createIndexFile(options)],
  ]);

  if (options.features.extensions) {
    files.set('extensions/example-extension.ts', createExtensionFile());
    files.set('test/example-extension.test.ts', createTestFile(options));
    files.set('scripts/create-extension.mjs', createExtensionScript(options));
  }

  if (options.features.extensions && options.bundle && options.bundler === 'tsup') {
    files.set('tsup.config.ts', createTsupConfig());
  }

  if (options.features.extensions && options.bundle && options.bundler === 'vite') {
    files.set('vite.config.ts', createViteConfig());
  }

  if (options.features.extensions && options.testRunner === 'vitest') {
    files.set('vitest.config.ts', createVitestConfig());
  }

  if (options.features.extensions && options.testRunner === 'jest') {
    files.set('jest.config.js', createJestConfig());
  }

  if (options.features.prompts) {
    files.set('src/prompts/index.ts', createPromptsIndexFile());
    files.set('prompts/example-prompt.md', createPromptFile());
    files.set('scripts/create-prompt.mjs', createPromptScript());
  }

  if (options.features.themes) {
    files.set('src/themes/index.ts', createThemesIndexFile());
    files.set('themes/default.json', createThemeFile());
    files.set('scripts/create-theme.mjs', createThemeScript());
  }

  if (options.features.skills) {
    files.set('skills/example-skill/SKILL.md', createSkillFile());
    files.set('scripts/create-skill.mjs', createSkillScript());
  }

  return files;
}
