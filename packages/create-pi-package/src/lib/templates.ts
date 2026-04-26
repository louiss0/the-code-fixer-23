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

  if (options.features.extensions) {
    addExtensionScripts(options, scripts, devDependencies);
  } else {
    scripts.build = 'tsc';
  }

  if (options.features.prompts) {
    scripts['create:prompt'] = 'node scripts/create-prompt.mjs';
  }

  if (options.features.skills) {
    scripts['create:skill'] = 'node scripts/create-skill.mjs';
  }

  if (options.features.themes) {
    scripts['create:theme'] = 'node scripts/create-theme.mjs';
  }

  const manifest = createPiManifest(options);

  return stringifyJson({
    name: options.projectName,
    version: '0.1.0',
    type: 'module',
    description: 'A PI package.',
    main: options.bundle ? 'dist/index.cjs' : 'dist/index.js',
    module: options.bundle ? 'dist/index.js' : undefined,
    types: 'dist/index.d.ts',
    files: ['dist', 'extensions', 'prompts', 'skills', 'themes', 'README.md', 'AGENTS.md', 'CLAUDE.md'],
    scripts,
    keywords: ['pi-package'],
    pi: manifest,
    dependencies,
    devDependencies,
  });
}

function addExtensionScripts(
  options: CreatePiPackageOptions,
  scripts: Record<string, string>,
  devDependencies: Record<string, string>
) {
  scripts['create:extension'] = 'node scripts/create-extension.mjs';

  if (options.bundle && options.bundler === 'tsup') {
    scripts.build = 'tsup extensions/*.ts --format esm,cjs --dts --minify --clean';
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
}

function createPiManifest(options: CreatePiPackageOptions) {
  const manifest: Record<string, string[]> = {};

  if (options.features.extensions) {
    manifest.extensions = ['./extensions'];
  }

  if (options.features.prompts) {
    manifest.prompts = ['./prompts'];
  }

  if (options.features.skills) {
    manifest.skills = ['./skills'];
  }

  if (options.features.themes) {
    manifest.themes = ['./themes'];
  }

  return manifest;
}

export function createReadme(options: CreatePiPackageOptions) {
  return `# ${options.projectName}

This is a PI package.

## Features

${options.features.extensions ? '- Extensions\n' : ''}${options.features.prompts ? '- Prompts\n' : ''}${
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
`;
}

export function createAgentsMd() {
  return `# AGENTS.md

## Project Overview

This package contains PI package assets such as prompts, themes, skills, and extensions.

## Rules for Agents

- Keep generated code small and readable.
- Prefer TypeScript.
- Keep public exports stable.
- Update README.md when behavior changes.
- Do not add dependencies unless they are needed.

## Common Commands

\`\`\`bash
npm run typecheck
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
npm run build
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
    "rootDir": ".",
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts", "extensions/**/*.ts", "test/**/*.ts"]
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
      extensions: ${options.features.extensions},
      prompts: ${options.features.prompts},
      themes: ${options.features.themes},
      skills: ${options.features.skills}
    }
  };
}
`;
}

export function createExtensionFile(name = 'example-extension') {
  return `import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function ${toIdentifier(name)}(pi: ExtensionAPI) {
  pi.registerCommand("${name}", {
    description: "Run the ${name} extension command.",
    handler: async (_args, ctx) => {
      ctx.ui.notify("${name} is working.", "info");
    }
  });
}
`;
}

export function createTsupConfig() {
  return `import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["extensions/*.ts"],
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
      entry: "extensions/example-extension.ts",
      name: "PiPackage",
      formats: ["es", "cjs"],
      fileName: (format) => format === "es" ? "index.js" : "index.cjs"
    },
    rollupOptions: {
      external: ["@mariozechner/pi-coding-agent"]
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
    include: ["test/**/*.test.ts"]
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
  const importPath = options.testRunner === 'vitest'
    ? '../extensions/example-extension.js'
    : '../extensions/example-extension';
  const vitestImport = options.testRunner === 'vitest'
    ? 'import { describe, expect, it } from "vitest";\n'
    : '';

  return `${vitestImport}import extension from "${importPath}";

describe("example extension", () => {
  it("exports an extension factory", () => {
    expect(typeof extension).toBe("function");
  });
});
`;
}

export function createPromptsIndexFile() {
  return `export const prompts = {
  example: {
    name: "example-prompt",
    description: "A starter prompt template.",
    content: "Review the following code and suggest improvements."
  }
};
`;
}

export function createPromptFile() {
  return `---
description: A starter PI prompt template
---

Review the following code and suggest improvements.
`;
}

export function createThemesIndexFile() {
  return `import theme from "../../themes/default.json" assert { type: "json" };

export const themes = {
  default: theme
};
`;
}

export function createThemeFile(name = 'default') {
  return stringifyJson({
    $schema:
      'https://raw.githubusercontent.com/badlogic/pi-mono/main/packages/coding-agent/src/modes/interactive/theme/theme-schema.json',
    name,
    vars: {
      primary: '#7c3aed',
      secondary: 242,
    },
    colors: createThemeColors(),
  });
}

function createThemeColors() {
  return {
    accent: 'primary',
    border: 'primary',
    borderAccent: '#00ffff',
    borderMuted: 'secondary',
    success: '#00ff00',
    error: '#ff0000',
    warning: '#ffff00',
    muted: 'secondary',
    dim: 240,
    text: '',
    thinkingText: 'secondary',
    selectedBg: '#2d2d30',
    userMessageBg: '#2d2d30',
    userMessageText: '',
    customMessageBg: '#2d2d30',
    customMessageText: '',
    customMessageLabel: 'primary',
    toolPendingBg: '#1e1e2e',
    toolSuccessBg: '#1e2e1e',
    toolErrorBg: '#2e1e1e',
    toolTitle: 'primary',
    toolOutput: '',
    mdHeading: '#ffaa00',
    mdLink: 'primary',
    mdLinkUrl: 'secondary',
    mdCode: '#00ffff',
    mdCodeBlock: '',
    mdCodeBlockBorder: 'secondary',
    mdQuote: 'secondary',
    mdQuoteBorder: 'secondary',
    mdHr: 'secondary',
    mdListBullet: '#00ffff',
    toolDiffAdded: '#00ff00',
    toolDiffRemoved: '#ff0000',
    toolDiffContext: 'secondary',
    syntaxComment: 'secondary',
    syntaxKeyword: 'primary',
    syntaxFunction: '#00aaff',
    syntaxVariable: '#ffaa00',
    syntaxString: '#00ff00',
    syntaxNumber: '#ff00ff',
    syntaxType: '#00aaff',
    syntaxOperator: 'primary',
    syntaxPunctuation: 'secondary',
    thinkingOff: 'secondary',
    thinkingMinimal: 'primary',
    thinkingLow: '#00aaff',
    thinkingMedium: '#00ffff',
    thinkingHigh: '#ff00ff',
    thinkingXhigh: '#ff0000',
    bashMode: '#ffaa00',
  };
}

export function createSkillFile(name = 'example-skill') {
  return `---
name: ${name}
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

export function createExtensionScript(options: CreatePiPackageOptions) {
  return `#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";

const bundler = "${options.bundler ?? 'none'}";
const testRunner = "${options.testRunner ?? 'none'}";
const args = parseArgs(process.argv.slice(2));
const name = await resolveValue(args.name, "Extension name");
const fileName = toKebabCase(name);

await mkdir("extensions", { recursive: true });
await mkdir("test", { recursive: true });
await writeFile(path.join("extensions", fileName + ".ts"), createExtension(fileName));
await writeFile(path.join("test", fileName + ".test.ts"), createTest(fileName));
console.log("Created extension " + fileName + " using " + bundler + " and " + testRunner + ".");

function parseArgs(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] === "--name") {
      result.name = values[index + 1];
      index += 1;
    }
  }
  return result;
}

async function resolveValue(value, label) {
  if (value) return value;
  const reader = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await reader.question(label + ": ")).trim();
  } finally {
    reader.close();
  }
}

function createExtension(fileName) {
  return 'import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";\\n\\nexport default function extension(pi: ExtensionAPI) {\\n  pi.registerCommand("' + fileName + '", {\\n    description: "Run ' + fileName + '.",\\n    handler: async (_args, ctx) => {\\n      ctx.ui.notify("' + fileName + ' is working.", "info");\\n    }\\n  });\\n}\\n';
}

function createTest(fileName) {
  const importPath = testRunner === "vitest" ? "../extensions/" + fileName + ".js" : "../extensions/" + fileName;
  const vitestImport = testRunner === "vitest" ? 'import { describe, expect, it } from "vitest";\\n' : "";
  return vitestImport + 'import extension from "' + importPath + '";\\n\\ndescribe("' + fileName + '", () => {\\n  it("exports an extension factory", () => {\\n    expect(typeof extension).toBe("function");\\n  });\\n});\\n';
}

function toKebabCase(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
`;
}

export function createPromptScript() {
  return `#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";

const args = parseArgs(process.argv.slice(2));
const name = toKebabCase(await resolveValue(args.name, "Prompt name"));
const body = await resolveBody(args, "Prompt body");

await mkdir("prompts", { recursive: true });
await writeFile(path.join("prompts", name + ".md"), body + "\\n");
console.log("Created prompt " + name + ".");

function parseArgs(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] === "--name" || values[index] === "--body" || values[index] === "--body-file") {
      result[values[index].slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = values[index + 1];
      index += 1;
    }
  }
  return result;
}

async function resolveBody(args, label) {
  if (args.bodyFile) return readFile(args.bodyFile, "utf8");
  return resolveValue(args.body, label);
}

async function resolveValue(value, label) {
  if (value) return value;
  const reader = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await reader.question(label + ": ")).trim();
  } finally {
    reader.close();
  }
}

function toKebabCase(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
`;
}

export function createSkillScript() {
  return `#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";

const args = parseArgs(process.argv.slice(2));
const name = toKebabCase(await resolveValue(args.name, "Skill name"));
const description = await resolveValue(args.description, "Skill description");
const body = await resolveBody(args, "Skill body");

await mkdir(path.join("skills", name), { recursive: true });
await writeFile(path.join("skills", name, "SKILL.md"), createSkill(name, description, body));
console.log("Created skill " + name + ".");

function parseArgs(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 1) {
    if (["--name", "--description", "--body", "--body-file"].includes(values[index])) {
      result[values[index].slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = values[index + 1];
      index += 1;
    }
  }
  return result;
}

async function resolveBody(args, label) {
  if (args.bodyFile) return readFile(args.bodyFile, "utf8");
  return resolveValue(args.body, label);
}

async function resolveValue(value, label) {
  if (value) return value;
  const reader = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await reader.question(label + ": ")).trim();
  } finally {
    reader.close();
  }
}

function createSkill(name, description, body) {
  return "---\\nname: " + name + "\\ndescription: " + description + "\\n---\\n\\n" + body + "\\n";
}

function toKebabCase(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
`;
}

export function createThemeScript() {
  return `#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";

const args = parseArgs(process.argv.slice(2));
const name = toKebabCase(await resolveValue(args.name, "Theme name"));

await mkdir("themes", { recursive: true });
await writeFile(path.join("themes", name + ".json"), JSON.stringify(createTheme(name), null, 2) + "\\n");
console.log("Created theme " + name + ".");

function parseArgs(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] === "--name") {
      result.name = values[index + 1];
      index += 1;
    }
  }
  return result;
}

async function resolveValue(value, label) {
  if (value) return value;
  const reader = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await reader.question(label + ": ")).trim();
  } finally {
    reader.close();
  }
}

function createTheme(name) {
  return ${JSON.stringify({
    $schema:
      'https://raw.githubusercontent.com/badlogic/pi-mono/main/packages/coding-agent/src/modes/interactive/theme/theme-schema.json',
    name: '__NAME__',
    vars: { primary: '#7c3aed', secondary: 242 },
    colors: createThemeColors(),
  }, null, 2).replace('"__NAME__"', 'name')};
}

function toKebabCase(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
`;
}

function toIdentifier(name: string) {
  const identifier = name.replace(/[^a-zA-Z0-9_$]/g, '');

  return identifier.length > 0 ? identifier : 'extension';
}
