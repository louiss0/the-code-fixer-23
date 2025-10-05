# @code-fixer-23/tsup-test-jest-eslint

E2E test lib with jest+eslint

**Testing**: jest

## Installation

```sh
# Using pnpm
pnpm add @code-fixer-23/tsup-test-jest-eslint

# Or using JPD if available
jpd add @code-fixer-23/tsup-test-jest-eslint
```

## Usage

```typescript
import { hello } from '@code-fixer-23/tsup-test-jest-eslint';

console.log(hello());
```

## Development

```sh
# Build the library
npx nx build tsup-test-jest-eslint

# Run type checking
npx nx typecheck tsup-test-jest-eslint
# Run tests
npx nx test tsup-test-jest-eslint

# Lint
npx nx lint tsup-test-jest-eslint
```
