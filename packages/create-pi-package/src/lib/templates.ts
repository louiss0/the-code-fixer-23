import type { CreatePiPackageOptions } from './types';

function stringifyJson(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function createPackageJson(options: CreatePiPackageOptions) {
  const scripts: Record<string, string> = {
    dev: 'tsx src/index.ts',
    typecheck: 'tsc --noEmit',
  };
  const dependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = {
    typescript: '^5.9.0',
    tsx: '^4.20.0',
  };

  if (options.bundle && options.bundler === 'tsup') {
    scripts.build = 'tsup src/index.ts --format esm,cjs --dts --minify --clean';
    devDependencies.tsup = '^8.5.0';
  }

  if (options.bundle && options.bundler === 'vite') {
    scripts.build = 'vite build --minify';
    devDependencies.vite = '^7.0.0';
    devDependencies['vite-plugin-dts'] = '^4.5.0';
  }

  if (!options.bundle) {
    scripts.build = 'tsc';
  }

  if (options.testRunner === 'vitest') {
    scripts.test = 'vitest';
    devDependencies.vitest = '^3.2.0';
  }

  if (options.testRunner === 'jest') {
    scripts.test = 'jest';
    devDependencies.jest = '^30.0.0';
    devDependencies['ts-jest'] = '^29.2.0';
    devDependencies['@types/jest'] = '^30.0.0';
  }

  return stringifyJson({
    name: options.projectName,
    version: '0.1.0',
    type: 'module',
    description: 'A PI package.',
    main: options.bundle ? 'dist/index.cjs' : 'dist/index.js',
    module: options.bundle ? 'dist/index.js' : undefined,
    types: 'dist/index.d.ts',
    files: ['dist', 'skills', 'README.md', 'AGENTS.md', 'CLAUDE.md'],
    scripts,
    dependencies,
    devDependencies,
  });
}

export function createReadme(options: CreatePiPackageOptions) {
  return `# ${options.projectName}

This is a PI package.

## Features

${options.features.prompts ? '- Prompts\n' : ''}${
    options.features.themes ? '- Themes\n' : ''
  }${options.features.skills ? '- Skills\n' : ''}
## Development

\`\`\`bash
npm run dev
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`

## Test

\`\`\`bash
npm test
\`\`\`
`;
}

export function createAgentsMd() {
  return `# AGENTS.md

## Project Overview

This package contains PI package assets such as prompts, themes, and skills.

## Rules for Agents

- Keep generated code small and readable.
- Prefer TypeScript.
- Keep public exports stable.
- Update README.md when behavior changes.
- Do not add dependencies unless they are needed.

## Common Commands

\`\`\`bash
npm run typecheck
npm test
npm run build
\`\`\`
`;
}

export function createClaudeMd() {
  return `# CLAUDE.md

## Project Context

This is a PI package project.

## Preferred Style

- Use TypeScript.
- Prefer named exports.
- Keep examples practical.
- Keep package docs in README.md.

## Before Changing Code

Run:

\`\`\`bash
npm run typecheck
npm test
\`\`\`
`;
}

export function createGitignore() {
  return `# Dependencies
node_modules
.pnp
.pnp.js

# Build output
dist
build
coverage
.turbo

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Environment
.env
.env.*
!.env.example

# OS
.DS_Store
Thumbs.db

# Editors
.vscode/*
!.vscode/extensions.json
.idea

# TypeScript
*.tsbuildinfo

# Test
.jest
.vitest

# Package manager
package-lock.json
yarn.lock
pnpm-lock.yaml
bun.lockb
`;
}

export function createTsConfig() {
  return `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"]
}
`;
}

export function createIndexFile(options: CreatePiPackageOptions) {
  const exports: string[] = [];

  if (options.features.prompts) {
    exports.push('export { prompts } from "./prompts/index.js";');
  }

  if (options.features.themes) {
    exports.push('export { themes } from "./themes/index.js";');
  }

  return `${exports.join('\n')}${exports.length > 0 ? '\n\n' : ''}export function definePiPackage() {
  return {
    name: "${options.projectName}",
    features: {
      prompts: ${options.features.prompts},
      themes: ${options.features.themes},
      skills: ${options.features.skills}
    }
  };
}
`;
}

export function createTsupConfig() {
  return `import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: true,
  target: "node20"
});
`;
}

export function createViteConfig() {
  return `import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [dts()],
  build: {
    minify: true,
    lib: {
      entry: "src/index.ts",
      name: "PiPackage",
      formats: ["es", "cjs"],
      fileName: (format) => format === "es" ? "index.js" : "index.cjs"
    },
    rollupOptions: {
      external: []
    }
  }
});
`;
}

export function createVitestConfig() {
  return `import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"]
  }
});
`;
}

export function createJestConfig() {
  return `export default {
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\\\.ts$": ["ts-jest", {
      useESM: true
    }]
  },
  extensionsToTreatAsEsm: [".ts"]
};
`;
}

export function createTestFile(options: CreatePiPackageOptions) {
  const importPath = options.testRunner === 'vitest' ? './index.js' : './index';
  const vitestImport =
    options.testRunner === 'vitest'
      ? 'import { describe, expect, it } from "vitest";\n'
      : '';

  return `${vitestImport}import { definePiPackage } from "${importPath}";

describe("package", () => {
  it("exports package metadata", () => {
    expect(definePiPackage().name).toBeTruthy();
  });
});
`;
}

export function createPromptsFile() {
  return `export const prompts = {
  codeReview: {
    name: "code-review",
    description: "Review code for correctness, clarity, and maintainability.",
    content: "Review the following code and suggest improvements."
  }
};
`;
}

export function createThemesFile() {
  return `export const themes = {
  default: {
    name: "default",
    colors: {
      primary: "#7c3aed",
      background: "#0f172a",
      foreground: "#f8fafc"
    }
  }
};
`;
}

export function createSkillFile() {
  return `---
name: example-skill
description: An example PI skill.
---

# Example Skill

Use this skill when the user wants help with a specific repeatable workflow.

## Instructions

- Understand the user's goal.
- Ask for missing critical context only when needed.
- Produce a useful result.
`;
}
