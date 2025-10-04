# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is an **Nx monorepo** workspace using **pnpm** as the package manager. The workspace follows a **CI-centric Git Flow** workflow with `main` and `develop` branches, utilizing the `git-flow` CLI for branch management.

## Package Manager

**Use pnpm** for all package operations. The user prefers JPD (custom CLI) if available, but defaults to pnpm otherwise.

## Essential Commands

### Development Setup

```sh
# Install dependencies
pnpm install --frozen-lockfile

# Sync TypeScript project references
npx nx sync
```

### Building & Testing

```sh
# Run all tasks (lint, test, build, typecheck) across all projects
npx nx run-many -t lint test build typecheck

# Build a specific package
npx nx build <package-name>

# Run tests for a specific package
npx nx test <package-name>

# Run typecheck for a specific package
npx nx typecheck <package-name>

# Run lint for a specific package
npx nx lint <package-name>
```

### Nx Workspace Commands

```sh
# Visualize project dependencies
npx nx graph

# Generate a new publishable library
npx nx g @nx/js:lib packages/<pkg-name> --publishable --importPath=@the-code-fixer-23/<pkg-name>

# Check if TypeScript project references are in sync (useful in CI)
npx nx sync:check
```

### Versioning & Releasing

```sh
# Version and release packages
npx nx release

# Dry run to preview what would be released
npx nx release --dry-run
```

## Git Flow Workflow (CI-Centric)

This project uses **Git Flow with CI-centric approach**:

### Branch Structure
- **`main`**: Always deployable to production
- **`develop`**: Primary integration branch for feature development
- **`feature/*`**: Feature branches (created from develop)
- **Hotfixes**: Temporary branches from `main` for production bugs

### Working with Features

```sh
# Start a new feature
git flow feature start <feature-name>

# Finish a feature (merges to develop)
git flow feature finish <feature-name>

# Push feature branch for collaboration/PR
git push -u origin feature/<feature-name>
```

### Hotfix Process

```sh
# Create temporary branch from main for production bug
git checkout main
git checkout -b fix/<issue-name>

# After fixing and testing, merge to main
git checkout main
git merge fix/<issue-name>

# Deploy main immediately, then merge back to develop
git checkout develop
git merge fix/<issue-name>

# Delete temporary branch
git branch -d fix/<issue-name>
```

### Deployment Flow
- Merge `develop` into `main` frequently (no release branches)
- `main` is deployed immediately after merge
- CI runs on all pushes to `main` and `develop`

## Commit Message Convention

Follow **Conventional Commits** with strict formatting:

```
<type>(<scope>): <subject line (≤ 64 chars)>
```

### Commit Types
- `feat`: New user-facing feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code formatting (no behavior change)
- `refactor`: Code restructuring
- `perf`: Performance improvements
- `test`: Test additions/modifications
- `build`: Build system/dependency changes
- `ci`: CI/CD configuration
- `chore`: Maintenance tasks

### Scope Rules
- Use the package name from package metadata (e.g., `@the-code-fixer-23/source`)
- For monorepo-wide changes, use workspace identifier: `@the-code-fixer-23`

### Example Commits
```sh
feat(@the-code-fixer-23/parser): add token validation
fix(@the-code-fixer-23/utils): handle empty input
docs(@the-code-fixer-23): update README with setup instructions
```

## TypeScript Configuration

The workspace uses strict TypeScript settings:
- **Module system**: `nodenext` (ESM + CommonJS interop)
- **Target**: `es2022`
- **Strict mode**: Enabled with all strict checks
- **Project references**: Automatically synced by Nx

## Code Style

- **Prettier**: Single quotes preferred (`.prettierrc`)
- **Format code**: `npx nx format:write` or `npx prettier --write .`
- **Check formatting**: `npx nx format:check`

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`):
- Runs on pushes to `main` and all pull requests
- Executes: `lint`, `test`, `build`, `typecheck` for all projects
- Uses Nx Cloud for task caching and distribution (optional)
- Node.js 20 with pnpm 9.8.0

## Architecture Notes

### Monorepo Structure
```
packages/
  <pkg-name>/
    src/
    project.json or package.json
    tsconfig.json
    tsconfig.lib.json
```

### Task Execution
Nx uses **inferred tasks** from the TypeScript plugin:
- `build`: Compiles TypeScript (uses `tsconfig.lib.json`)
- `typecheck`: Type checks without emitting files
- `build-deps`: Builds dependencies before building the project
- `watch-deps`: Watches dependencies for changes

### Project References
TypeScript project references are automatically managed:
- Run `npx nx sync` to update references based on dependencies
- Run `npx nx sync:check` in CI to enforce correctness

## Nx Cloud

Workspace is connected to Nx Cloud (ID: `68e0102b19999567fd36b781`):
- Task caching across CI runs
- Optional: Distributed task execution (commented out in CI config)

## Adding New Packages

### Standard Nx TypeScript Library

When creating a new package:

```sh
# Generate publishable library
npx nx g @nx/js:lib packages/<pkg-name> --publishable --importPath=@the-code-fixer-23/<pkg-name>

# Install dependencies
pnpm install

# Commit all files (atomically)
git add .
git commit -m "feat(@the-code-fixer-23/<pkg-name>): add new package"
```

### JSR TypeScript Library

For libraries intended for JSR (JavaScript Registry) publishing, use the **nx-jsr plugin**:

```sh
# Generate JSR library (will prompt for bundler choice)
npx nx g @the-code-fixer-23/nx-jsr:library <pkg-name> \
  --importPath=@scope/pkg-name \
  --description="Package description" \
  --directory=packages

# Or specify bundler explicitly
npx nx g @the-code-fixer-23/nx-jsr:library <pkg-name> \
  --importPath=@scope/pkg-name \
  --bundler=none

# Install dependencies
pnpm install

# Build the library
npx nx build <pkg-name>

# Type check
npx nx typecheck <pkg-name>

# Publish to JSR (dry run first)
npx nx publish <pkg-name> --dryRun
npx nx publish <pkg-name> --token=<your-jsr-token>
```

#### Bundler Options

The nx-jsr plugin supports **three bundlers**:

| Bundler  | Command Flag       | Best For                          | Notes                        |
| -------- | ------------------ | --------------------------------- | ---------------------------- |
| `none`   | `--bundler=none`   | JSR-first projects (recommended)  | TypeScript source only, fastest |
| `esbuild`| `--bundler=esbuild`| Performance-critical builds       | Fast bundling, minimal config |
| `tsup`   | `--bundler=tsup`   | Modern library development        | Best DX, auto .d.ts generation |

**Default:** `none` (TypeScript source only)

**Recommendation:** Use `--bundler=none` for JSR-exclusive libraries, as JSR was designed to work directly with TypeScript source.

#### JSR Library Structure

The JSR generator creates:

```
packages/<pkg-name>/
├── src/
│   └── index.ts          # Main entry point
├── jsr.json              # JSR configuration (name, version, exports)
├── package.json          # Package metadata with "type": "module"
├── tsconfig.json         # TypeScript project references
├── tsconfig.lib.json     # TypeScript library config
└── README.md             # Library documentation
```

#### JSR Configuration (`jsr.json`)

```json
{
  "name": "@scope/pkg-name",
  "version": "0.1.0",
  "exports": "./src/index.ts"
}
```

For multiple entry points:

```json
{
  "name": "@scope/pkg-name",
  "version": "0.1.0",
  "exports": {
    ".": "./src/index.ts",
    "./utils": "./src/utils.ts"
  }
}
```

#### JSR Publishing

```sh
# Publish with JSR_TOKEN environment variable
export JSR_TOKEN=your-token
npx nx publish <pkg-name>

# Or pass token directly
npx nx publish <pkg-name> --token=your-token

# Dry run to validate
npx nx publish <pkg-name> --dryRun

# Allow uncommitted changes (not recommended)
npx nx publish <pkg-name> --allowDirty
```

#### Nx Targets for JSR Libraries

- **build**: Compiles TypeScript, includes `jsr.json` and README in output
- **typecheck**: Type checks without emitting files
- **publish**: Publishes to JSR using `npx jsr publish`

## Testing Philosophy

- **Test-first workflow preferred** (TDD)
- Unit tests > Integration tests > E2E tests
- Aim for 80%+ coverage (60% minimum)
- Test behavior, not implementation
- Never ship code without tests

## Development Environment Notes

- **OS**: Windows (PowerShell)
- **Editor preference**: Micro with plugins (lsp, wakatime, detectindent, fzf, jump)
- **Themes**: Nord and Dracula
- Applications: Prefer Flatpak (local packages) on Linux; executables via Nix
- Dotfiles managed with **yadm** (setup: `yadm clone` then `yadm bootstrap`)
