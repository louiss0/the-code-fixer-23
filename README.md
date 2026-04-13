# TheCodeFixer23

A pnpm + Nx monorepo for publishing reusable Nx plugins.

## Packages

- [@code-fixer-23/nx-tsup](./packages/nx-tsup) - Nx plugin for generating and building TypeScript libraries with Tsup.
- [@code-fixer-23/nx-jsr](./packages/nx-jsr) - Nx plugin for scaffolding and publishing TypeScript libraries to JSR.

## Install

```sh
pnpm install
```

## Run workspace tasks

```sh
# Build all publishable packages
pnpm nx run-many -t build --projects=@code-fixer-23/nx-tsup,@code-fixer-23/nx-jsr

# Test all publishable packages
pnpm nx run-many -t test --projects=@code-fixer-23/nx-tsup,@code-fixer-23/nx-jsr

# Typecheck all publishable packages
pnpm nx run-many -t typecheck --projects=@code-fixer-23/nx-tsup,@code-fixer-23/nx-jsr
```

## Release

This workspace uses `nx release` with independent package versioning.

```sh
# Preview the next release
pnpm nx release --dry-run

# Publish release changes and packages
pnpm nx release
```

Release configuration lives in [nx.json](./nx.json).

### GitHub Actions + 1Password

The release workflow loads the npm token from 1Password using `1password/load-secrets-action`.

Required GitHub secret:

- `OP_SERVICE_ACCOUNT_TOKEN`

1Password reference used by the workflow:

- `op://Development/Code Fixer 23 NPM Token/credential`

## Notes

- Projects tagged `paused` are excluded from release automation.
- Package-specific usage and installation docs live in each package README.
