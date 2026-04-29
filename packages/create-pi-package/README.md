# @code-fixer-23/create-pi-package

Scaffold publish-ready PI packages with `extensions/`, `skills/`, `prompts/`, a tiny helper API, and opinionated tooling presets.

## Usage

```sh
pnpm create-pi-package
pnpm create-pi-package --tooling biome --test-runner jest
```

## Options

- `--directory <path>` target directory, defaults to the current working directory
- `--name <name>` explicit package leaf name; otherwise inferred from the target directory
- `--tooling <eslint-prettier|biome>` tooling preset
- `--test-runner <vitest|jest>` test runner preset
- `--yes` accept defaults for omitted interactive choices
- `--force` overwrite managed scaffold files when they already exist

## Development

```sh
pnpm --dir packages/create-pi-package run check
```
