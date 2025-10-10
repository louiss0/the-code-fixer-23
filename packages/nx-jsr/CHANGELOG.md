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
