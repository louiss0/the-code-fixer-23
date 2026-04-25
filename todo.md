# Tests that are failing

- No local tests were run during this handoff.
- The known problem is functional: generated ESLint configs from `@code-fixer-23/nx-tsup` and `@code-fixer-23/nx-jsr` are incorrect for new projects.

# What bugs are present

- `packages/nx-tsup/src/generators/library/library.ts` writes a minimal `eslint.config.mjs` that only exports `@eslint/js` recommended rules.
- `packages/nx-jsr/src/generators/library/library.ts` does the same.
- Those generated ESLint configs do not properly initialize ESLint for TypeScript/Nx projects, so newly generated projects get incomplete lint setup.
- The lint target is generated, but the config it relies on is too bare to match the workspace's actual ESLint setup.
- Temporary local files are present in the worktree and were not part of this handoff work:
  - `.verdaccio-inspect.log`
  - `.verdaccio-publish.log`
  - `.verdaccio-smoke.log`
  - `.verdaccio-smoke.pid`
  - `.verdaccio-smoke.port`
  - `.verdaccio-test.log`
  - `nul`

# What to do next

- Inspect the workspace ESLint setup and compare it with what generated packages should look like.
  - Start with `eslint.config.mjs` at the repo root.
  - Compare with package-level configs that already work.
- Decide the correct fix for both generators.
  - Prefer using the Nx CLI/project initialization flow for ESLint after project creation instead of hand-writing another minimal config.
  - The next agent should actively reproduce the issue through the CLI path first, then implement the fix through that same CLI-driven setup if possible.
  - Only fall back to generating a package-level flat config if the CLI path cannot produce the required result.
- Update both generators consistently:
  - `packages/nx-tsup/src/generators/library/library.ts`
  - `packages/nx-jsr/src/generators/library/library.ts`
- Add or update generator tests to prove the generated ESLint config is correct.
- Reproduce by generating fresh test projects from both generators and verifying lint works.
- Do not spend time on the enums publish issue for this handoff; the active task is only the incorrect generated ESLint configuration.
