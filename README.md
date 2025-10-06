# TheCodeFixer23

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

✨ Your new, shiny [Nx workspace](https://nx.dev) is almost ready ✨.

[Learn more about this workspace setup and its capabilities](https://nx.dev/nx-api/js?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) or run `npx nx graph` to visually explore what was created. Now, let's get you up to speed!

## Finish your CI setup

[Click here to finish setting up your workspace!](https://cloud.nx.app/connect/Rpk27RLfpc)

## Packages

This monorepo contains the following packages:

- **[@code-fixer-23/nx-tsup](./packages/nx-tsup)** - NX plugin for creating TypeScript libraries with Tsup bundler
- **[@code-fixer-23/is-even](./packages/is-even)** - Demo library: Check if a number is even

## Generate a library

### Using the nx-tsup plugin (recommended)

Generate a new TypeScript library with [Tsup](https://tsup.egoist.dev/) bundler:

```sh
# Generate with vitest and eslint (default)
pnpm nx generate @code-fixer-23/nx-tsup:library my-lib \
  --directory=packages \
  --importPath=@code-fixer-23/my-lib \
  --description="My awesome library"

# Generate with different options
pnpm nx generate @code-fixer-23/nx-tsup:library my-lib \
  --directory=packages \
  --importPath=@code-fixer-23/my-lib \
  --testRunner=jest \
  --linter=biome

# Generate with no tests or linting
pnpm nx generate @code-fixer-23/nx-tsup:library my-lib \
  --directory=packages \
  --importPath=@code-fixer-23/my-lib \
  --testRunner=none \
  --linter=none
```

**Available options:**

- `--testRunner` - Test framework: `vitest` (default), `jest`, or `none`
- `--linter` - Code linter: `eslint` (default), `biome`, or `none`
- `--description` - Package description for README and package.json

### Using the standard NX generator

```sh
npx nx g @nx/js:lib packages/pkg1 --publishable --importPath=@my-org/pkg1
```

## Run tasks

### Build libraries

Libraries created with `@code-fixer-23/nx-tsup` use Tsup for ultra-fast builds:

```sh
# Build a library
pnpm nx build my-lib

# Build with watch mode
pnpm nx build my-lib --watch

# Build with minification
pnpm nx build my-lib --minify

# Build with sourcemaps
pnpm nx build my-lib --sourcemap
```

**Build outputs:**

- `dist/index.mjs` - ESM bundle
- `dist/index.d.mts` - TypeScript declarations

### Test libraries

```sh
# Run tests (if configured with vitest or jest)
pnpm nx test my-lib

# Run tests in watch mode
pnpm nx test my-lib --watch
```

### Lint libraries

```sh
# Lint code (if configured with eslint or biome)
pnpm nx lint my-lib
```

### Type check

```sh
# Check TypeScript types without emitting files
pnpm nx typecheck my-lib
```

### Run any task

To run any task with Nx use:

```sh
npx nx <target> <project-name>
```

These targets are either [inferred automatically](https://nx.dev/concepts/inferred-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) or defined in the `project.json` or `package.json` files.

[More about running tasks in the docs &raquo;](https://nx.dev/features/run-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Versioning and releasing

To version and release the library use

```
npx nx release
```

Pass `--dry-run` to see what would happen without actually releasing the library.

### Paused Projects

Some projects in this workspace are tagged as `paused`, meaning they are not ready for release. These projects are automatically excluded from:

- CI builds and tests
- Release workflows (`nx release`)
- Pre-release build commands

**Currently paused projects:**

- `@code-fixer-23/nx-jsr` - JSR plugin development paused
- `is-even` - Example library for JSR (paused)

To mark a project as paused, add `"tags": ["paused"]` to its `package.json` (in the `nx` section) or `project.json` configuration.

[Learn more about Nx release &raquo;](https://nx.dev/features/manage-releases?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Keep TypeScript project references up to date

Nx automatically updates TypeScript [project references](https://www.typescriptlang.org/docs/handbook/project-references.html) in `tsconfig.json` files to ensure they remain accurate based on your project dependencies (`import` or `require` statements). This sync is automatically done when running tasks such as `build` or `typecheck`, which require updated references to function correctly.

To manually trigger the process to sync the project graph dependencies information to the TypeScript project references, run the following command:

```sh
npx nx sync
```

You can enforce that the TypeScript project references are always in the correct state when running in CI by adding a step to your CI job configuration that runs the following command:

```sh
npx nx sync:check
```

[Learn more about nx sync](https://nx.dev/reference/nx-commands#sync)

[Learn more about Nx on CI](https://nx.dev/ci/intro/ci-with-nx#ready-get-started-with-your-provider?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Install Nx Console

Nx Console is an editor extension that enriches your developer experience. It lets you run tasks, generate code, and improves code autocompletion in your IDE. It is available for VSCode and IntelliJ.

[Install Nx Console &raquo;](https://nx.dev/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Useful links

Learn more:

- [Learn more about this workspace setup](https://nx.dev/nx-api/js?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Learn about Nx on CI](https://nx.dev/ci/intro/ci-with-nx?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Releasing Packages with Nx release](https://nx.dev/features/manage-releases?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [What are Nx plugins?](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

And join the Nx community:

- [Discord](https://go.nx.dev/community)
- [Follow us on X](https://twitter.com/nxdevtools) or [LinkedIn](https://www.linkedin.com/company/nrwl)
- [Our Youtube channel](https://www.youtube.com/@nxdevtools)
- [Our blog](https://nx.dev/blog?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
