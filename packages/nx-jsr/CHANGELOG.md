## 1.3.1 (2026-05-20)

### 🩹 Fixes

- **testing:** reduce nx test log noise ([8b39b6a](https://github.com/louiss0/the-code-fixer-23/commit/8b39b6a))

### ❤️ Thank You

- louiss0 @louiss0

## 1.3.0 (2026-05-01)

### 🚀 Features

- **nx-jsr:** improve JSR library generation ([#14](https://github.com/louiss0/the-code-fixer-23/pull/14))

### 🩹 Fixes

- **workspace:** update lockfile and stabilize tests ([#15](https://github.com/louiss0/the-code-fixer-23/pull/15))

### ❤️ Thank You

- shelton louis @louiss0

## 1.2.2 (2026-05-01)

### 🩹 Fixes

- **nx-plugins:** use dist paths in generators/executors JSON manifests ([433adde](https://github.com/louiss0/the-code-fixer-23/commit/433adde))

### ❤️ Thank You

- louiss0 @louiss0
- Oz

## 1.2.1 (2026-04-27)

### 🩹 Fixes

- **nx-plugins:** load local executors from source ([bbdd1e9](https://github.com/louiss0/the-code-fixer-23/commit/bbdd1e9))

### ❤️ Thank You

- louiss0 @louiss0

## 1.2.0 (2026-04-26)

### 🚀 Features

- **enums:** merge PR #9 - Refine enums and package scaffolding ([#9](https://github.com/louiss0/the-code-fixer-23/issues/9))

### 🩹 Fixes

- **plugin-packaging:** declare Nx plugin build deps ([8fc7e05](https://github.com/louiss0/the-code-fixer-23/commit/8fc7e05))

### ❤️ Thank You

- louiss0 @louiss0
- shelton louis @louiss0

## 1.1.4 (2026-04-25)

### 🩹 Fixes

- **nx-jsr:** skip false-positive plugin manifest lint ([9034cbb](https://github.com/louiss0/the-code-fixer-23/commit/9034cbb))
- **packages:** add .js extensions to plugin entry manifests ([d9daa80](https://github.com/louiss0/the-code-fixer-23/commit/d9daa80))

### ❤️ Thank You

- louiss0 @louiss0

## 1.1.3 (2026-04-14)

### 🩹 Fixes

- **nx-jsr:** use nx run-commands in generator targets ([8023be5](https://github.com/louiss0/the-code-fixer-23/commit/8023be5))
- **workspace:** resolve release lint blockers ([027a691](https://github.com/louiss0/the-code-fixer-23/commit/027a691))
- **packages:** resolve esm generator file paths ([470a672](https://github.com/louiss0/the-code-fixer-23/commit/470a672))
- **packages:** publish verified verdaccio builds ([09793e8](https://github.com/louiss0/the-code-fixer-23/commit/09793e8))
- **packages:** correct package test and pack setup ([9215fcb](https://github.com/louiss0/the-code-fixer-23/commit/9215fcb))
- **release:** format tracked files for workflow ([302ff1f](https://github.com/louiss0/the-code-fixer-23/commit/302ff1f))

### ❤️ Thank You

- louiss0 @louiss0

## 1.1.1 (2026-04-09)

This was a version bump only for @code-fixer-23/nx-jsr to align it with other projects, there were no code changes.

## 1.1.0 (2025-10-10)

### 🚀 Features

- **nx-jsr:** add formatter support with prettier, biome, and eslint-stylistic ([838f68d](https://github.com/louiss0/the-code-fixer-23/commit/838f68d))
- **nx-jsr:** add schema and detection for linter/formatter support (WIP) ([8449c03](https://github.com/louiss0/the-code-fixer-23/commit/8449c03))

### 🩹 Fixes

- **nx-tsup:** add missing .js extensions to ES module imports ([afb395c](https://github.com/louiss0/the-code-fixer-23/commit/afb395c))
- **nx-jsr:** fix TypeScript errors and add enquirer dependency ([cbe1a9c](https://github.com/louiss0/the-code-fixer-23/commit/cbe1a9c))
- **nx-jsr:** add enquirer to external dependencies in vite config ([fe8fdb0](https://github.com/louiss0/the-code-fixer-23/commit/fe8fdb0))

### ❤️ Thank You

- Shelton Louis @louiss0

# 1.0.0 (2025-10-08)

### 🚀 Features

- ⚠️ **nx-jsr:** add validate executor and manual-only versioning # remove bundlers from README; default generator to standalone; improve publish auth/inference; fix exports ([2582045](https://github.com/louiss0/the-code-fixer-23/commit/2582045))
- add release workflow and prepare plugins for npm publication ([11d28d1](https://github.com/louiss0/the-code-fixer-23/commit/11d28d1))
- ⚠️ **nx-jsr:** change to standalone mode by default ([ba91cb9](https://github.com/louiss0/the-code-fixer-23/commit/ba91cb9))
- **nx-jsr:** change default directory to root level for standalone JSR projects ([fde3d03](https://github.com/louiss0/the-code-fixer-23/commit/fde3d03))
- **ci:** add paused tag system for projects not ready for release ([9be7ce7](https://github.com/louiss0/the-code-fixer-23/commit/9be7ce7))
- **is-even:** add is-even package for JSR ([413cd92](https://github.com/louiss0/the-code-fixer-23/commit/413cd92))
- ⚠️ **nx-jsr:** add version executor for JSR packages ([29ce161](https://github.com/louiss0/the-code-fixer-23/commit/29ce161))
- **nx-jsr:** replace bundler with test runner option ([d19437b](https://github.com/louiss0/the-code-fixer-23/commit/d19437b))
- **@the-code-fixer-23/nx-jsr:** add bundler support (none, esbuild, tsup) ([68d9210](https://github.com/louiss0/the-code-fixer-23/commit/68d9210))
- **@the-code-fixer-23/nx-jsr:** add Nx plugin for JSR library scaffolding and publishing ([2b655bc](https://github.com/louiss0/the-code-fixer-23/commit/2b655bc))

### 🩹 Fixes

- **nx-jsr:** remove duplicate nx key in package.json and merge targets ([55f9f84](https://github.com/louiss0/the-code-fixer-23/commit/55f9f84))
- **nx-jsr:** improve publish executor validation and tests ([e24ff4a](https://github.com/louiss0/the-code-fixer-23/commit/e24ff4a))

### ⚠️ Breaking Changes

- **nx-jsr:** generator no longer registers an Nx project in standalone mode; auto-conventional versioning removed in favor of manual versioning and Nx Release integration.
- **nx-jsr:** Default project generation behavior has changed.
- **nx-jsr:** bump major version

### ❤️ Thank You

- Shelton Louis @louiss0
