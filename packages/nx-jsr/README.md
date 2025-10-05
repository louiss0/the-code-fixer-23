# @code-fixer-23/nx-jsr

An Nx plugin for scaffolding and publishing TypeScript libraries to [JSR (JavaScript Registry)](https://jsr.io).

## Features

- **Library Generator**: Scaffold JSR-ready TypeScript libraries with proper structure
- **Publish Executor**: Publish libraries to JSR with built-in validation
- **JSR Configuration**: Automatic `jsr.json` generation with proper exports
- **TypeScript Setup**: Pre-configured TypeScript settings for JSR compatibility

## Installation

```sh
pnpm add -D @code-fixer-23/nx-jsr
```

## Generators

### `library`

Generate a new JSR TypeScript library.

> **Note**: JSR doesn't fully support monorepos yet, so projects are generated at the **root level** by default. This creates standalone projects that can be published to JSR independently. Monorepo support may be added to JSR in the future.

#### Usage

```sh
# Generate at root level (default - recommended for JSR)
npx nx g @code-fixer-23/nx-jsr:library my-lib --importPath=@scope/my-lib

# Or explicitly specify root level
npx nx g @code-fixer-23/nx-jsr:library my-lib --importPath=@scope/my-lib --directory=.

# Generate in packages directory (if you want monorepo structure)
npx nx g @code-fixer-23/nx-jsr:library my-lib --importPath=@scope/my-lib --directory=packages
```

#### Options

| Option        | Type                          | Required | Description                                                  |
| ------------- | ----------------------------- | -------- | ------------------------------------------------------------ |
| `name`        | string                        | Yes      | Library name (kebab-case)                                    |
| `importPath`  | string                        | Yes      | JSR import path (e.g., `@scope/package-name`)                |
| `bundler`     | `'none'` \| `'esbuild'` \| `'tsup'` | No       | Bundler to use (default: `'none'`)                           |
| `directory`   | string                        | No       | Directory where library will be created (default: `.` for root-level) |
| `description` | string                        | No       | Package description                                          |
| `skipFormat`  | boolean                       | No       | Skip formatting files (default: `false`)                     |

#### What Gets Generated

The generator creates a standalone project at root level:

```
my-lib/                   # Generated at root level by default
├── src/
│   └── index.ts          # Main entry point
├── jsr.json              # JSR configuration
├── package.json          # Package metadata
├── tsconfig.json         # TypeScript project references
├── tsconfig.lib.json     # TypeScript library config
└── README.md             # Library documentation
```

**jsr.json example:**

```json
{
  "name": "@scope/my-lib",
  "version": "0.1.0",
  "exports": "./src/index.ts"
}
```

#### Nx Targets

The generated library includes these Nx targets:

- **build**: Compile TypeScript to JavaScript
- **typecheck**: Run type checking without emitting files
- **publish**: Publish to JSR using the publish executor

## Executors

### `publish`

Publish a TypeScript library to JSR.

#### Usage

```sh
# Publish to JSR
npx nx publish my-lib

# Dry run (validate without publishing)
npx nx publish my-lib --dryRun

# Publish with authentication token
npx nx publish my-lib --token=your-jsr-token
```

#### Options

| Option        | Type    | Required | Description                                              |
| ------------- | ------- | -------- | -------------------------------------------------------- |
| `packageRoot` | string  | Yes      | Root directory of the package to publish                 |
| `dryRun`      | boolean | No       | Run in dry-run mode (no actual publishing)               |
| `token`       | string  | No       | JSR authentication token (or use `JSR_TOKEN` env var)    |
| `allowDirty`  | boolean | No       | Allow publishing with uncommitted changes (default: `false`) |

#### Authentication

You can provide JSR authentication in two ways:

1. **Via option**: `--token=your-jsr-token`
2. **Via environment variable**: `JSR_TOKEN=your-jsr-token`

```sh
# Using environment variable
export JSR_TOKEN=your-jsr-token
npx nx publish my-lib
```

## Example Workflow

### 1. Generate a new JSR library

```sh
npx nx g @code-fixer-23/nx-jsr:library utils --importPath=@myorg/utils --description="Utility functions"
```

### 2. Implement your library

```typescript
// packages/utils/src/index.ts
export function add(a: number, b: number): number {
  return a + b;
}
```

### 3. Build and test

```sh
# Type check
npx nx typecheck utils

# Build
npx nx build utils
```

### 4. Publish to JSR

```sh
# Dry run first
npx nx publish utils --dryRun

# Publish for real
npx nx publish utils --token=your-jsr-token
```

## JSR Configuration

The `jsr.json` file is automatically generated with the following structure:

```json
{
  "name": "@scope/package-name",
  "version": "0.1.0",
  "exports": "./src/index.ts"
}
```

You can customize the exports to expose multiple entry points:

```json
{
  "name": "@scope/package-name",
  "version": "0.1.0",
  "exports": {
    ".": "./src/index.ts",
    "./utils": "./src/utils.ts"
  }
}
```

## Bundler Options

The plugin supports **three bundler configurations** to match different project needs:

### Choosing a Bundler

| Bundler    | Best For                          | Build Speed | Bundle Size | DX       |
| ---------- | --------------------------------- | ----------- | ----------- | -------- |
| **none**   | JSR-first projects, simple libs   | ⚡⚡⚡       | N/A         | Simple   |
| **esbuild**| Performance-critical builds       | ⚡⚡⚡       | Small       | Minimal  |
| **tsup**   | Modern library development        | ⚡⚡        | Small       | Excellent|

### `none` (TypeScript Source Only)

**Recommended for JSR** - JSR was designed to work directly with TypeScript source code.

```sh
npx nx g @code-fixer-23/nx-jsr:library my-lib \
  --importPath=@scope/my-lib \
  --bundler=none
```

**Characteristics:**
- Uses `@nx/js:tsc` executor
- No bundling, just TypeScript compilation
- Fastest build times
- No additional dependencies
- Perfect for JSR's TypeScript-first approach

**Build target:**
```json
{
  "executor": "@nx/js:tsc",
  "options": {
    "outputPath": "dist/packages/my-lib",
    "main": "packages/my-lib/src/index.ts",
    "tsConfig": "packages/my-lib/tsconfig.lib.json"
  }
}
```

### `esbuild` (Fast Bundling)

**Best for performance-critical builds** where speed matters most.

```sh
npx nx g @code-fixer-23/nx-jsr:library my-lib \
  --importPath=@scope/my-lib \
  --bundler=esbuild
```

**Characteristics:**
- Uses `@nx/esbuild:esbuild` executor
- Extremely fast bundling
- Minimal configuration
- Generates `esbuild.config.js`
- Adds `esbuild` as dev dependency

**Generated `esbuild.config.js`:**
```javascript
const { build } = require('esbuild');

build({
  entryPoints: ['./src/index.ts'],
  bundle: true,
  outfile: './dist/index.js',
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  sourcemap: true,
  minify: false,
  external: [],
}).catch(() => process.exit(1));
```

**Build target:**
```json
{
  "executor": "@nx/esbuild:esbuild",
  "options": {
    "outputPath": "dist/packages/my-lib",
    "main": "packages/my-lib/src/index.ts",
    "format": ["esm"],
    "platform": "neutral",
    "target": "es2022"
  }
}
```

### `tsup` (Modern Library Bundler)

**Best for modern library development** with excellent developer experience.

```sh
npx nx g @code-fixer-23/nx-jsr:library my-lib \
  --importPath=@scope/my-lib \
  --bundler=tsup
```

**Characteristics:**
- Uses `nx:run-commands` to run `tsup`
- Built on esbuild with better defaults
- Automatic `.d.ts` generation
- JSR-friendly configuration
- Generates `tsup.config.ts`
- Adds `tsup` as dev dependency

**Generated `tsup.config.ts`:**
```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,              // Generates .d.ts files
  sourcemap: true,
  clean: true,
  minify: false,
  target: 'es2022',
  platform: 'neutral',
});
```

**Build target:**
```json
{
  "executor": "nx:run-commands",
  "options": {
    "command": "tsup",
    "cwd": "packages/my-lib"
  }
}
```

### Decision Guide

**Choose `none` if:**
- Publishing exclusively to JSR
- Want fastest build times
- Prefer simplicity
- Don't need bundling

**Choose `esbuild` if:**
- Need fast bundling
- Want minimal configuration
- Building performance-critical libraries
- Comfortable with manual config tweaks

**Choose `tsup` if:**
- Want modern DX
- Need automatic `.d.ts` generation
- Prefer zero-config approach
- Building libraries for multiple registries

## TypeScript Configuration

Libraries are configured with strict TypeScript settings compatible with JSR requirements:

- **Module system**: ES modules (`"type": "module"`)
- **Target**: ES2022
- **Strict mode**: Enabled
- **Declaration files**: Generated automatically

## Development

### Building the Plugin

```sh
npx nx build nx-jsr
```

### Running Unit Tests

```sh
npx nx test nx-jsr
```

### Publishing the Plugin

```sh
npx nx release
```

## Requirements

- Node.js 20+
- Nx 21.6.3+
- TypeScript 5.9+
- JSR CLI (automatically installed via npx)

## Resources

- [JSR Documentation](https://jsr.io/docs)
- [Nx Documentation](https://nx.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
