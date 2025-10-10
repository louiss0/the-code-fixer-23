# @code-fixer-23/nx-tsup

An **NX plugin** for building TypeScript libraries using **[Tsup](https://tsup.egoist.sh/)** - the fastest way to bundle your TypeScript libraries with zero config.

## ⚠️ Breaking Changes in v0.1.0

**Important**: The `outputPath` option has been renamed to `outDir` to align with tsup's native naming conventions.

If you're upgrading from v0.0.x, run the automatic migration:

```bash
nx migrate @code-fixer-23/nx-tsup@latest
nx migrate --run-migrations
```

This will automatically update all your project.json files.

## Features

- 🚀 **Fast Bundling** - Powered by esbuild through Tsup
- 📦 **Zero Configuration** - Sensible defaults, works out of the box
- 🎯 **Type-Safe** - Automatic TypeScript declaration file generation
- 🔧 **Config Merging** - Smart merging of `tsup.config.ts` and `project.json` options
- 🧪 **Test Integration** - Optional Vitest or Jest setup with auto-detection
- 🎨 **Linter Support** - Optional ESLint or Biome integration
- ⚙️ **Advanced Options** - Full tsup feature support (splitting, treeshake, external, etc.)
- 📚 **Monorepo Ready** - Works with both integrated and package-based monorepos

## Installation

### Prerequisites

Ensure you have an NX workspace set up. If not, create one:

```bash
npx create-nx-workspace@latest
```

### Install the Plugin

```bash
# Using pnpm (recommended)
pnpm add -D @code-fixer-23/nx-tsup tsup

# Or using npm
npm install --save-dev @code-fixer-23/nx-tsup tsup
```

## Usage

### Generate a New Library

Create a new Tsup-powered library:

```bash
# Interactive mode (recommended)
nx generate @code-fixer-23/nx-tsup:library

# With options
nx generate @code-fixer-23/nx-tsup:library my-lib \\
  --importPath=@my-scope/my-lib \\
  --description="My awesome library" \\
  --testRunner=vitest \\
  --linter=eslint
```

### Generator Options

| Option        | Type       | Default    | Description                               |
| ------------- | ---------- | ---------- | ----------------------------------------- | -------------------------------- | --------------------- |
| `name`        | `string`   | _required_ | Library name (kebab-case)                 |
| `importPath`  | `string`   | _required_ | Import path (e.g., `@scope/package-name`) |
| `directory`   | `string`   | `packages` | Directory where library will be created   |
| `description` | `string`   | `""`       | Package description                       |
| `testRunner`  | `vitest \\ | jest \\    | none`                                     | auto-detect (fallback: `jest`)   | Test framework to use |
| `linter`      | `eslint \\ | biome \\   | none`                                     | auto-detect (fallback: `eslint`) | Linter to configure   |
| `skipFormat`  | `boolean`  | `false`    | Skip formatting generated files           |

### Build Your Library

```bash
# Build a specific library
nx build my-lib

# Build all libraries
nx run-many -t build

# Build with watch mode
nx build my-lib --watch
```

### Executor Options

The build executor supports the following options:

#### Core Options

| Option     | Type                       | Default    | Description                       |
| ---------- | -------------------------- | ---------- | --------------------------------- |
| `outDir`   | `string`                   | _required_ | Output directory for built files  |
| `main`     | `string`                   | _required_ | Entry point file                  |
| `tsConfig` | `string`                   | _required_ | Path to tsconfig file             |
| `format`   | `('esm'\|'cjs'\|'iife')[]` | `['esm']`  | Output formats (CLI-only)         |
| `watch`    | `boolean`                  | `false`    | Enable watch mode (CLI-only)      |
| `assets`   | `string[]`                 | `[]`       | Additional assets to copy to dist |

#### Build Options

| Option      | Type                                     | Default   | Description                           |
| ----------- | ---------------------------------------- | --------- | ------------------------------------- |
| `dts`       | `boolean`                                | `true`    | Generate TypeScript declaration files |
| `clean`     | `boolean`                                | `true`    | Clean output directory before build   |
| `minify`    | `boolean`                                | `false`   | Minify output                         |
| `sourcemap` | `boolean \| 'inline'`                    | `false`   | Generate sourcemaps                   |
| `splitting` | `boolean`                                | `false`   | Enable code splitting (ESM only)      |
| `treeshake` | `boolean \| 'smallest' \| 'recommended'` | `false`   | Enable tree shaking                   |
| `target`    | `string`                                 | `es2022`  | ECMAScript target (e.g., 'esnext')    |
| `platform`  | `'node' \| 'browser' \| 'neutral'`       | `neutral` | Target platform                       |

#### Dependency Options

| Option       | Type       | Default | Description                             |
| ------------ | ---------- | ------- | --------------------------------------- |
| `external`   | `string[]` | `[]`    | External dependencies to exclude        |
| `noExternal` | `string[]` | `[]`    | Dependencies to force include in bundle |

#### Advanced Options

| Option           | Type                    | Default | Description                              |
| ---------------- | ----------------------- | ------- | ---------------------------------------- |
| `banner`         | `object`                | `{}`    | Code to prepend (e.g., `{js: '// ...'}`) |
| `footer`         | `object`                | `{}`    | Code to append                           |
| `env`            | `Record<string,string>` | `{}`    | Environment variables to define          |
| `define`         | `Record<string,string>` | `{}`    | Global constants to define               |
| `inject`         | `string[]`              | `[]`    | Files to automatically inject            |
| `esbuildOptions` | `object`                | `{}`    | Additional esbuild options               |
| `esbuildPlugins` | `string[]`              | `[]`    | Paths to esbuild plugin modules          |

**Note**: `watch` and `format` are CLI-only options and should not be defined in `project.json`. All other options can be configured in both `project.json` and `tsup.config.ts`, with `project.json` taking precedence.

## Generated Project Structure

When you generate a library, the following structure is created:

```
packages/my-lib/
├── src/
│   ├── index.ts              # Entry point
│   └── index.spec.ts         # Example test (if test runner selected)
├── dist/                     # Build output (after running build)
│   ├── index.js              # ESM bundle
│   └── index.d.ts            # Type declarations
├── tsup.config.ts            # Tsup configuration
├── tsconfig.json             # TypeScript config (project references)
├── tsconfig.lib.json         # TypeScript config (lib-specific)
├── package.json              # Package manifest with exports
├── README.md                 # Package documentation
├── vitest.config.ts          # Vitest config (if selected)
├── jest.config.ts            # Jest config (if selected)
└── eslint.config.mjs         # ESLint config (if selected)
```

## Auto-detection behavior

When you omit `--testRunner` and/or `--linter`, the generator inspects your workspace root `package.json` to detect installed tools by their official package names:

- Test runners: `jest`, `vitest`
- Linters: `eslint`, `@biomejs/biome`

Selection rules:

- If exactly one candidate is present, it is selected automatically.
- If both are present, you will be prompted to choose in interactive mode. In non-interactive/CI environments, the fallback is `jest` for tests and `eslint` for linting.
- If none are present, the fallback is `jest` and `eslint`.

To override detection, pass explicit flags, e.g. `--testRunner=vitest --linter=eslint`.

## Configuration

### Tsup Configuration

Each generated library includes a `tsup.config.ts` file at its root. You can customize the build process by modifying this file:

```ts
// packages/my-lib/tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'], // Add CJS format
  dts: true,
  clean: true,
  sourcemap: true, // Enable sourcemaps
  minify: true, // Enable minification
  target: 'es2022',
  splitting: false,
  treeshake: true,
});
```

### Configuration Merging Strategy

🆕 **New in v0.1.0**: The plugin now intelligently merges options from `tsup.config.ts` and `project.json`, giving you the best of both worlds.

#### How It Works

1. **Config File Discovery**: The executor searches for `tsup.config.{ts,mts,cts,js,mjs,cjs}` in your project root
2. **Smart Merging**: Options from `project.json` override those in `tsup.config.ts`
3. **TypeScript Support**: `.ts` config files are compiled on-the-fly using esbuild
4. **Function Configs**: Supports function-based configs with environment parameters

#### Supported Config Files (in order of precedence)

- `tsup.config.ts`
- `tsup.config.mts`
- `tsup.config.cts`
- `tsup.config.js`
- `tsup.config.mjs`
- `tsup.config.cjs`

#### Merge Rules

- **Primitives** (boolean, string, number): `project.json` value replaces config file value
- **Arrays**: `project.json` array replaces config file array (no concatenation)
- **Objects** (`banner`, `footer`, `env`, `define`): Deep merge with `project.json` winning
- **`esbuildOptions`**: Composed as a function chain, `project.json` applied last
- **CLI-only flags** (`watch`, `format`): Applied at runtime, not merged

#### Example: Basic Merging

**tsup.config.ts**:

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  target: 'es2020',
  splitting: false,
  banner: { js: '// Copyright 2025' },
});
```

**project.json**:

```json
{
  "targets": {
    "build": {
      "executor": "@code-fixer-23/nx-tsup:build",
      "options": {
        "outDir": "packages/my-lib/dist",
        "main": "packages/my-lib/src/index.ts",
        "tsConfig": "packages/my-lib/tsconfig.lib.json",
        "target": "esnext",
        "minify": true
      }
    }
  }
}
```

**Result**: Target is `esnext` (from `project.json`), splitting is `false` (from config), minify is `true` (from `project.json`), and banner is preserved.

#### Example: Function-based Config

```ts
import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  target: options.watch ? 'es2022' : 'esnext',
  minify: !options.watch,
  dts: true,
}));
```

The function receives `{ watch, format, mode }` parameters.

#### Example: Advanced - esbuildOptions & Plugins

**project.json**:

```json
{
  "options": {
    "outDir": "dist",
    "main": "src/index.ts",
    "tsConfig": "tsconfig.lib.json",
    "external": ["react", "react-dom"],
    "esbuildOptions": {
      "keepNames": true
    },
    "esbuildPlugins": ["./esbuild-plugins/my-plugin.js"]
  }
}
```

Plugins are loaded from paths relative to the project root.

### Package.json Exports

Generated libraries automatically include proper `exports` configuration:

```json
{
  "name": "@my-scope/my-lib",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    }
  }
}
```

## Monorepo Support

### Integrated Monorepo (Default)

In an integrated monorepo, `tsup` is installed at the workspace root and shared across all packages. This is the default configuration.

### Package-based Monorepo

If your `package.json` includes a `workspaces` field, the generator automatically:

- Detects the package-based setup
- Adds `tsup` to each generated package's `devDependencies`
- Ensures each package can build independently

## Advanced Usage

### Multiple Entry Points

Edit your `tsup.config.ts` to support multiple entry points:

```ts
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
  },
  format: ['esm'],
  dts: true,
});
```

### Custom Build Target

Override build options in your `project.json`:

```json
{
  "targets": {
    "build": {
      "executor": "@code-fixer-23/nx-tsup:build",
      "options": {
        "outDir": "packages/my-lib/dist",
        "main": "packages/my-lib/src/index.ts",
        "tsConfig": "packages/my-lib/tsconfig.lib.json",
        "minify": true,
        "sourcemap": true,
        "splitting": true,
        "treeshake": "smallest",
        "external": ["react"]
      }
    }
  }
}
```

**Note**: Use `--format` and `--watch` as CLI flags: `nx build my-lib --format=esm,cjs --watch`

## Testing

### Run Tests

```bash
# Run tests for a specific library
nx test my-lib

# Run all tests
nx run-many -t test

# Run tests in watch mode
cd packages/my-lib && pnpm vitest
```

## Linting

### Run Linter

```bash
# Lint a specific library
nx lint my-lib

# Lint all libraries
nx run-many -t lint
```

## Type Checking

```bash
# Type-check a specific library
nx typecheck my-lib

# Type-check all libraries
nx run-many -t typecheck
```

## Troubleshoots

### Tsup not found

Ensure `tsup` is installed at the workspace root:

```bash
pnpm add -D -w tsup
```

### Build fails with module resolution errors

Check your `tsconfig.lib.json` compiler options. Ensure `moduleResolution` is set correctly for your target environment.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT

## Related

- [Tsup Documentation](https://tsup.egoist.sh/)
- [NX Documentation](https://nx.dev/)
- [TypeScript](https://www.typescriptlang.org/)
