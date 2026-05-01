# @code-fixer-23/nx-jsr

An Nx plugin for scaffolding and publishing TypeScript libraries to [JSR (JavaScript Registry)](https://jsr.io).

## Features

- Library Generator: JSR-ready TypeScript libraries (standalone by default, Nx-integrated with `--directory`)
- Publish Executor: Publish to JSR with dry-run, token, and allow-dirty options
- Validate Executor: Structural checks + `jsr publish --dry-run`
- Version Executor: Manual version update for `jsr.json` (Nx Release recommended for semver/versioning workflow)

## Installation

```sh
pnpm add -D @code-fixer-23/nx-jsr
```

## Generator: `library`

Generate a new JSR TypeScript library.

- Default: Standalone/package-based mode in the current directory (no Nx project registered, package dev dependencies written locally)
- Monorepo/integrated mode: Provide `--directory=<dir>` to generate into `<dir>/<name>`, register an Nx project, generate Jest/Vitest config with Nx generators, add wildcard dependencies to the workspace root, and install them with the package manager Nx detects from the workspace

### Usage

```sh
# Standalone (default - files in current directory)
npx nx g @code-fixer-23/nx-jsr:library my-lib --importPath=@scope/my-lib

# Monorepo mode (creates packages/my-lib/ and registers Nx project)
npx nx g @code-fixer-23/nx-jsr:library my-lib --importPath=@scope/my-lib --directory=packages

# Custom directory
npx nx g @code-fixer-23/nx-jsr:library my-lib --importPath=@scope/my-lib --directory=libs
```

### Options

| Option        | Type                         | Required | Description                                                     |
| ------------- | ---------------------------- | -------- | --------------------------------------------------------------- |
| `name`        | `string`                     | Yes      | Library name in kebab-case                                      |
| `importPath`  | `string`                     | Yes      | JSR import path, for example `@scope/package-name`              |
| `directory`   | `string`                     | No       | Create files in `<directory>/<name>` and register an Nx project |
| `description` | `string`                     | No       | Package description                                             |
| `skipFormat`  | `boolean`                    | No       | Skip formatting generated files                                 |
| `skipInstall` | `boolean`                    | No       | Skip dependency installation in integrated Nx mode              |
| `testRunner`  | `vitest` \| `jest` \| `none` | No       | Choose a test runner for generated projects                     |

### What Gets Generated

Standalone (no `--directory`):

```
.
├── src/
│   └── index.ts
├── jsr.json
├── package.json
├── tsconfig.json
├── tsconfig.lib.json
└── README.md
```

Monorepo mode (`--directory=packages`):

```
packages/
└── my-lib/
    ├── src/
    │   └── index.ts
    ├── jsr.json
    ├── package.json
    ├── tsconfig.json
    ├── tsconfig.lib.json
    └── README.md
```

`jsr.json` example:

```json
{
  "name": "@scope/my-lib",
  "version": "0.1.0",
  "exports": "./src/index.ts"
}
```

### Dependency handling

Standalone mode writes package-based wildcard `devDependencies` into the generated `package.json`.
Integrated Nx mode keeps the generated package manifest minimal, uses Nx generators for Jest/Vitest configuration, adds wildcard dependencies to the workspace root `package.json`, then installs with the package manager Nx detects from the workspace lockfile/configuration.

### Nx Targets (monorepo mode)

- build: Compile TypeScript to JavaScript
- typecheck: Run type checking without emitting files
- validate: Validate setup and run `jsr publish --dry-run`
- publish: Publish to JSR
- version: Manually set `jsr.json` version (use Nx Release for full versioning pipelines)

## Executors

### validate

Validate a package and run JSR dry-run publish.

```sh
npx nx validate my-lib
```

Options:

- `packageRoot` (optional): Root of the package. Inferred from project; falls back to current directory.
- `dryRun` (boolean): Always runs as dry-run (default true).

Checks:

- jsr.json exists with name, version, and exports
- tsconfig.lib.json has `declaration: true`
- Executes `npx jsr publish --dry-run`

### publish

Publish a TypeScript library to JSR.

```sh
# Publish to JSR (token required)
npx nx publish my-lib

# Dry run (validate without publishing)
npx nx publish my-lib --dryRun

# Publish with token passed explicitly
npx nx publish my-lib --token=your-jsr-token
```

Token resolution order:

1. `--token`
2. `JSR_TOKEN` env var
3. `.env` in the package root
4. `.env` in the workspace root

If no token is found and `--dryRun` is not set, the executor fails with a helpful message.

Options:

- `packageRoot` (optional): Inferred from project; falls back to current directory.
- `dryRun` (boolean): Dry-run mode.
- `token` (string): Explicit JSR token.
- `allowDirty` (boolean): Allow publishing with uncommitted changes.

### version (manual only)

Explicitly set the `version` field in `jsr.json`.

```sh
npx nx version my-lib --version=1.2.3
```

Options:

- `packageRoot` (required): Root directory of the package.
- `version` (required): Semver to set.
- `push` (optional): Attempts to create and push a tag if the working tree is clean. No auto-commit is performed.
- `tagPrefix` (optional): Defaults to `v`.

Notes:

- Prefer using Nx Release to orchestrate versioning across projects. This executor is a manual setter only.

## Nx Release (recommended)

Use Nx Release to set versions and create tags, then run `publish` for each package as part of your pipeline. Example minimal `nx.json` (docs only):

```json
{
  "release": {
    "projects": ["packages/*"],
    "changelog": false,
    "git": { "tag": true, "tagPrefix": "v" }
  }
}
```

## Requirements

- Node.js 20+
- Nx 21.6.3+
- TypeScript 5.9+
- JSR CLI (installed or invoked through the detected package manager)

## Resources

- JSR Documentation: https://jsr.io/docs
- Nx Documentation: https://nx.dev
- TypeScript Documentation: https://www.typescriptlang.org/docs
