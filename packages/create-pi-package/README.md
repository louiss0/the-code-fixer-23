# @code-fixer-23/create-pi-package

Scaffold PI packages with the familiar `create-*` flow.

`create-pi-package` asks which PI resource folders you want, creates the matching starter files, adds a `scripts/create-*` helper for each selected resource, and optionally sets up extension testing.

## Feature highlights

- Uses a familiar `create-*` scaffolding flow for PI packages
- Lets you choose one or many resource folders in a single run
- Generates starter files for `extensions`, `prompts`, `skills`, and `themes`
- Adds matching `scripts/create-*` helpers for every selected resource
- Sets up extension testing with either `jest` or `vitest`
- Generates a strict `tsconfig.json` when extension tooling is needed
- Creates a ready-to-edit `package.json` for extension packages
- Can also create `AGENTS.md` and `CLAUDE.md`

## Usage

```sh
pnpm create pi-package
pnpm create pi-package my-pi-package
pnpm create pi-package my-pi-package --project-folders extensions prompts --runner vitest
```

## What it generates

Depending on your selections, the package can create:

- `extensions/index.ts`
- `prompts/example.md`
- `skills/example/SKILL.md`
- `themes/theme.json`
- matching scaffold scripts in `scripts/`
- `AGENTS.md` and `CLAUDE.md` when `--instructions` is used

If `extensions` is selected, it also generates:

- a strict `tsconfig.json`
- either `vitest.config.ts` or `jest.config.cjs`
- a `package.json` with test scripts and dev dependencies
- dependency installation by default

## Example generated tree

For example, if you choose `extensions`, `prompts`, and `skills`, you will get a structure like this:

```txt
my-pi-package/
├── extensions/
│   └── index.ts
├── prompts/
│   └── example.md
├── skills/
│   └── example/
│       └── SKILL.md
├── scripts/
│   ├── create-extension.ts
│   ├── create-prompt.ts
│   └── create-skill.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

If you choose `jest` instead of `vitest`, `jest.config.cjs` is generated instead of `vitest.config.ts`.

## Prompt flow

### Step 1 — Choose what to include

Question:

> What do you want to include in this PI package?

Choices are presented in this order:

- `extensions`
- `prompts`
- `skills`
- `themes`

You can select one or many. For every selected folder, `create-pi-package` creates:

- a starter file in that folder
- a matching `scripts/create-*` helper

**Bypass key:** `--project-folders <folders...>`

Example:

```sh
pnpm create pi-package my-pi-package --project-folders extensions prompts skills
```

### Step 2 — Choose a test runner

This question is only asked if you selected `extensions`.

Question:

> Which test runner do you want to use?

Choices are presented in this order:

- `jest`
- `vitest`

Your choice controls which config file is generated:

- `jest` → `jest.config.cjs`
- `vitest` → `vitest.config.ts`

A strict `tsconfig.json` is also generated for extension packages.

**Bypass key:** `--runner <jest|vitest>`

Example:

```sh
pnpm create pi-package my-pi-package --project-folders extensions --runner vitest
```

## Non-interactive examples

Bypass the folder selection step:

```sh
pnpm create pi-package my-pi-package --project-folders prompts themes
```

Bypass the test runner step for an extension package:

```sh
pnpm create pi-package my-pi-package --project-folders extensions --runner jest
```

Bypass both interactive steps at once:

```sh
pnpm create pi-package my-pi-package --project-folders extensions prompts skills themes --runner vitest
```

Add agent instruction files without prompts:

```sh
pnpm create pi-package my-pi-package --project-folders prompts --instructions
```

Skip dependency installation for extension scaffolds:

```sh
pnpm create pi-package my-pi-package --project-folders extensions --runner vitest --no-install
```

## CLI options

- `--project-folders <project-folders...>` folders to generate
- `--runner <runner>` test runner to use when `extensions` is selected
- `--instructions` also create `AGENTS.md` and `CLAUDE.md`
- `--no-install` skip dependency installation
