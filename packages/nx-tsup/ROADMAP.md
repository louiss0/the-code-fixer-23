# nx-tsup Plugin Roadmap

## Completed Features ✅

- [x] Library generator with Tsup bundler integration
- [x] Build executor with configurable options
- [x] Support for multiple test runners (vitest, jest, none)
- [x] Support for multiple linters (eslint, biome, none)
- [x] TypeScript configuration generation
- [x] Package.json generation with proper exports
- [x] Comprehensive README templates
- [x] ESM-first output with TypeScript declarations
- [x] Basic asset copying support
- [x] Monorepo type detection (integrated vs package-based)
- [x] Unit tests for generator and executor

## Planned Enhancements 🚀

### High Priority

#### 1. Multiple Entry Points Support

Allow libraries to have multiple entry points for better code splitting:

```typescript
// In generator schema
{
  entries?: string[]; // ['src/index.ts', 'src/cli.ts', 'src/utils.ts']
}

// Generated tsup.config.ts
export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts', 'src/utils.ts'],
  format: ['esm'],
  dts: true,
  clean: true
});
```

**Benefits:**

- Better tree-shaking for consumers
- Separate CLI from library code
- Allow importing subpaths: `@pkg/utils`

#### 2. Configurable Build Defaults via Generator

Expose more Tsup options during library generation:

```bash
pnpm nx generate @code-fixer-23/nx-tsup:library my-lib \
  --minify=true \
  --sourcemap=true \
  --splitting=true \
  --target=es2020
```

**Options to add:**

- `--minify` - Enable minification by default
- `--sourcemap` - Enable sourcemaps by default
- `--splitting` - Enable code splitting
- `--target` - Set ES target version
- `--platform` - Node, browser, or neutral

### Medium Priority

#### 3. Enhanced Assets Handling

Support glob patterns and transformations for asset copying:

```typescript
// Current (basic)
{
  assets: ['README.md', 'LICENSE'];
}

// Enhanced (glob patterns + output mapping)
{
  assets: [
    {
      input: 'src/templates',
      glob: '**/*.hbs',
      output: 'templates',
    },
    {
      input: 'assets',
      glob: '**/*.{png,jpg,svg}',
      output: 'static',
    },
  ];
}
```

#### 4. Publish Executor

Add a publish executor for publishing to npm/JSR:

```json
{
  "targets": {
    "publish": {
      "executor": "@code-fixer-23/nx-tsup:publish",
      "options": {
        "registry": "https://registry.npmjs.org",
        "access": "public",
        "dryRun": false
      }
    }
  }
}
```

**Features:**

- Version bumping
- Git tag creation
- Changelog generation
- npm/JSR publishing
- Dry-run support

#### 5. Watch Mode Improvements

Better watch mode experience with automatic test running:

```bash
# Watch build + tests in parallel
pnpm nx watch my-lib --test

# Watch with livereload for browser testing
pnpm nx watch my-lib --reload
```

### Low Priority

#### 6. Bundle Analysis

Add bundle size analysis and reporting:

```bash
pnpm nx build my-lib --analyze

# Output
Bundle Analysis:
  index.mjs: 2.3 KB (gzipped: 1.1 KB)
  cli.mjs: 4.5 KB (gzipped: 1.8 KB)

Dependencies:
  - tslib: 1.2 KB
  - ...
```

#### 7. External Dependencies Management

Smart external dependencies detection and configuration:

```typescript
// Auto-detect and externalize all deps
{
  autoExternal: true, // default
  external: ['react', 'react-dom'], // manual overrides
  noExternal: ['lodash-es'] // force bundling
}
```

#### 8. Multiple Output Formats

Support generating multiple formats simultaneously:

```bash
pnpm nx generate @code-fixer-23/nx-tsup:library my-lib \
  --formats=esm,cjs,iife

# Generates:
# - dist/index.mjs (ESM)
# - dist/index.cjs (CommonJS)
# - dist/index.global.js (IIFE for browsers)
```

#### 9. Pre/Post Build Hooks

Support custom scripts before/after build:

```json
{
  "targets": {
    "build": {
      "executor": "@code-fixer-23/nx-tsup:build",
      "options": {
        "preBuild": "node scripts/pre-build.js",
        "postBuild": "node scripts/copy-files.js"
      }
    }
  }
}
```

#### 10. TypeScript Paths Alias Support

Automatically configure path aliases from tsconfig:

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@utils/*": ["src/utils/*"],
      "@components/*": ["src/components/*"]
    }
  }
}

// Auto-resolved in tsup build
```

## Community Requests 💡

Have an idea? [Open an issue](https://github.com/louiss0/code-fixer-23/issues) with the `nx-tsup` label!

## Contributing

Want to help implement these features? Check out [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

**Version:** 0.0.1  
**Last Updated:** 2025-10-04
