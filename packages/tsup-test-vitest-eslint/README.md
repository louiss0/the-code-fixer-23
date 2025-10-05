# @code-fixer-23/tsup-test-vitest-eslint

E2E test lib with vitest+eslint

**Testing**: vitest

## Installation

```sh
# Using pnpm
pnpm add @code-fixer-23/tsup-test-vitest-eslint

# Or using JPD if available
jpd add @code-fixer-23/tsup-test-vitest-eslint
```

## Usage

```typescript
import { hello } from '@code-fixer-23/tsup-test-vitest-eslint';

console.log(hello());
```

## Development

```sh
# Build the library
npx nx build tsup-test-vitest-eslint

# Run type checking
npx nx typecheck tsup-test-vitest-eslint
# Run tests
npx nx test tsup-test-vitest-eslint

# Lint
npx nx lint tsup-test-vitest-eslint
```
