# Contributing to create-pi-package

Thanks for helping improve `create-pi-package`. This package scaffolds PI
packages, so changes should protect the generated user experience as carefully
as the CLI implementation itself.

## Development setup

From the repository root, install dependencies:

```bash
pnpm install
```

Work from the package directory when running package scripts directly:

```bash
cd packages/create-pi-package
```

Useful commands:

```bash
pnpm run test
pnpm run typecheck
pnpm run lint
pnpm run build
```

## Project shape

Important source files:

| Path                           | Purpose                                                       |
| ------------------------------ | ------------------------------------------------------------- |
| `src/index.ts`                 | Node executable entry point and exported CLI helpers.         |
| `src/lib/command.ts`           | Commander command definition and flag validation.             |
| `src/lib/prompts.ts`           | Interactive questionnaire and option resolution.              |
| `src/lib/create-pi-package.ts` | Main package creation flow.                                   |
| `src/lib/write-files.ts`       | File selection and write/overwrite behavior.                  |
| `src/lib/templates.ts`         | Generated file templates and generated scaffold scripts.      |
| `src/index.spec.ts`            | Behavior tests for CLI parsing, generated files, and scripts. |

## Testing expectations

Use test-driven development for behavior changes.

When changing CLI behavior, add or update tests for:

- parsed Commander options
- invalid option errors
- interactive-question side effects when they can be observed through public
  inputs
- generated `package.json` scripts, dependencies, and PI manifest
- files that should exist
- files that should not exist
- generated follow-up scaffold scripts

Generated output is the public API. Tests should verify what users receive, not
internal helper structure.

## Resource workflow rules

Keep these product rules intact unless a change explicitly updates them:

- Users can select multiple resource types in one PI package.
- Extensions are first in the questionnaire because they may need tooling.
- Bundler and test-runner questions apply only when extensions are selected.
- Prompt-only, skill-only, and theme-only packages should not receive extension
  bundler or test-runner artifacts.
- Themes can be generated alone or alongside extensions, prompts, and skills.
- Selected resource types should each get one starter example.
- Selected resource types should each get a matching `npm run create:*` script.
- Generated scripts should support flags and prompt for missing values.
- Prompt and skill body input should support both `--body` and `--body-file`.
- Theme files should include all required PI color tokens.

## Adding a new generated file

When adding or changing generated files:

- Update `src/lib/templates.ts` for the file content.
- Update `src/lib/write-files.ts` for when the file should be written.
- Update tests in `src/index.spec.ts` to cover both existence and absence where
  relevant.
- Update `README.md` if users need to know about the file or script.

## Manual smoke testing

After tests pass, build the package and run the CLI from a temporary directory:

```bash
pnpm run build
node dist/index.js ./tmp-smoke --extensions --prompts --skills --themes --bundler tsup --test-runner vitest --no-install --force
```

Inspect the generated package:

```bash
cd tmp-smoke
npm run create:extension -- --name audit-helper
npm run create:prompt -- --name daily-review --body "Review today's work."
npm run create:skill -- --name release-check --description "Checks releases." --body "# Release Check"
npm run create:theme -- --name violet-night
```

## Documentation expectations

The README is user documentation. Keep it updated when you change:

- CLI flags
- questionnaire behavior
- generated files
- generated scripts
- bundler or test-runner behavior
- PI package conventions

`CONTRIBUTING.md` is maintainer documentation. Keep it focused on developing
this package rather than using generated PI packages.

## Commit style

Use the repository commit format:

```txt
<type>(<scope>): <imperative subject>
```

Examples:

```txt
feat(create-pi-package): add theme scaffold script
test(create-pi-package): cover prompt body files
docs(create-pi-package): document resource workflows
```

Keep commits focused on one logical change and make sure validation passes
before committing.
