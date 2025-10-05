# @code-fixer-23/nx-tsup

> Note: Minor README touch to seed the first patch bump via conventional commit.

An **NX plugin** for building TypeScript libraries using **[Tsup](https://tsup.egoist.sh/)** - the fastest way to bundle your TypeScript libraries with zero config.

## Features

- 🚀 **Fast Bundling** - Powered by esbuild through Tsup
- 📦 **Zero Configuration** - Sensible defaults, works out of the box
- 🎯 **Type-Safe** - Automatic TypeScript declaration file generation
- 🧪 **Test Integration** - Optional Vitest or Jest setup
- 🎨 **Linter Support** - Optional ESLint or Biome integration
- 🔧 **Customizable** - Full control over Tsup configuration per package
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

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | *required* | Library name (kebab-case) |
| `importPath` | `string` | *required* | Import path (e.g., `@scope/package-name`) |
| `directory` | `string` | `packages` | Directory where library will be created |
| `description` | `string` | `""` | Package description |
| `testRunner` | `vitest \| jest \| none` | `vitest` | Test framework to use |
| `linter` | `eslint \| biome \| none` | `eslint` | Linter to configure |
| `skipFormat` | `boolean` | `false` | Skip formatting generated files |

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

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `outputPath` | `string` | *required* | Output directory for built files |
| `main` | `string` | *required* | Entry point file |
| `tsConfig` | `string` | *required* | Path to tsconfig file |
| `format` | `('esm'\|'cjs'\|'iife')[]` | `['esm']` | Output formats |
| `dts` | `boolean` | `true` | Generate TypeScript declaration files |
| `clean` | `boolean` | `true` | Clean output directory before build |
| `watch` | `boolean` | `false` | Enable watch mode |
| `minify` | `boolean` | `false` | Minify output |
| `sourcemap` | `boolean` | `false` | Generate sourcemaps |
| `assets` | `string[]` | `[]` | Additional assets to copy to dist |

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

## Configuration

### Tsup Configuration

Each generated library includes a `tsup.config.ts` file at its root. You can customize the build process by modifying this file:

```ts
// packages/my-lib/tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],  // Add CJS format
  dts: true,
  clean: true,
  sourcemap: true,          // Enable sourcemaps
  minify: true,             // Enable minification
  target: 'es2022',
  splitting: false,
  treeshake: true,
});
```

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
        "outputPath": "packages/my-lib/dist",
        "main": "packages/my-lib/src/index.ts",
        "tsConfig": "packages/my-lib/tsconfig.lib.json",
        "format": ["esm", "cjs"],
        "minify": true,
        "sourcemap": true
      }
    }
  }
}
```

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
