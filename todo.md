# Tests that are failing

- No failing tests are currently recorded for the handoff task.
- The next agent should run:
  - `pnpm exec nx reset`
  - `pnpm exec nx build @code-fixer-23/nx-tsup`
  - `pnpm exec nx test @code-fixer-23/nx-tsup`
  - `pnpm exec nx generate @code-fixer-23/nx-tsup:library ...` in a safe repro path
  - `pnpm exec nx build <generated-project>`

# What bugs are present

- `packages/enums` and `packages/create-pi-package` are fixed locally as source-only TS packages, but they still do not rely on the shared `@code-fixer-23/nx-tsup:build` executor.
- The unfinished bug is in the shared `nx-tsup` plugin path, not in those two packages.
- The `@code-fixer-23/nx-tsup` plugin still has a broken generator/executor story for package outputs:
  - generated libraries default to package-local `dist` behavior in the generator source
  - attempts to move those builds cleanly to workspace `dist/packages/...` need a proper shared solution
- The plugin packaging path is also fragile:
  - executor schemas were being resolved incorrectly from packaged output
  - plugin build dependencies had to be declared explicitly for Nx/Vite resolution to work
- The next agent should assume the real unfinished issue is:
  - make TSUP-generated Nx libraries work from the shared plugin without package-specific `run-commands` fallbacks
  - keep builds in the correct output location
  - avoid any `prepare-dist` or post-build copy script workaround

# What to do next

- Start from the shared plugin, not from `packages/enums` or `packages/create-pi-package`.
- Reproduce the generator problem end-to-end with a freshly generated library from:
  - `packages/nx-tsup/src/generators/library/library.ts`
- Fix the generator defaults so new TSUP packages use the correct Nx-style output location.
  - Check `outDir` in generated build targets.
  - Decide whether the correct convention should be `dist/packages/<project>` or another single workspace-level path.
- Fix the shared executor path so generated packages can use `@code-fixer-23/nx-tsup:build` directly.
  - No `nx:run-commands` fallback in generated packages.
  - No `prepare-dist` script.
  - No package-specific publish shim.
- Verify plugin packaging is correct for runtime use.
  - Check `packages/nx-tsup/executors.json`
  - Check `packages/nx-tsup/package.json`
  - Check `packages/nx-tsup/vite.config.ts`
- After the shared fix works, migrate `packages/enums` and `packages/create-pi-package` to rely on the shared TSUP executor/generator pattern.
- Re-run:
  - `pnpm exec nx reset`
  - `pnpm exec nx build @code-fixer-23/nx-tsup`
  - `pnpm exec nx test @code-fixer-23/nx-tsup`
  - `pnpm exec nx run-many -t typecheck test build --projects=enums,create-pi-package`
