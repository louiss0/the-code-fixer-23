# @the-code-fixer-23/is-even

A simple, fast utility to check if a number is even.

**Testing**: vitest | **Linting**: eslint

## Installation

```sh
# Using pnpm
pnpm add @the-code-fixer-23/is-even

# Or using JPD if available
jpd add @the-code-fixer-23/is-even
```

## Usage

```typescript
import { isEven } from '@the-code-fixer-23/is-even';

console.log(isEven(2));   // true
console.log(isEven(3));   // false
console.log(isEven(0));   // true
console.log(isEven(-4));  // true
```

## API

### `isEven(num: number): boolean`

Returns `true` if the number is even, `false` otherwise.

- **Parameters:**
  - `num` - The number to check
- **Returns:** `boolean` - true if even, false if odd

## Features

- ✅ TypeScript support with full type definitions
- ✅ Zero dependencies
- ✅ ESM module format
- ✅ Works with positive, negative, and zero
- ✅ Fully tested
- ✅ Lightweight (~100 bytes)

## Development

```sh
# Build the library
npx nx build is-even

# Run type checking
npx nx typecheck is-even
# Run tests
npx nx test is-even

# Lint
npx nx lint is-even
```
