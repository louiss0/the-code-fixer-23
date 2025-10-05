# @code-fixer-23/is-even

A simple, lightweight utility to check if a number is even. Because sometimes you just need to know! 😄

**Testing**: vitest  
**Coverage**: 100%

## Installation

```sh
# Using JSR
npx jsr add @code-fixer-23/is-even

# Using Deno
import { isEven } from "jsr:@code-fixer-23/is-even";
```

## Usage

```typescript
import { isEven } from '@code-fixer-23/is-even';

// Check positive numbers
isEven(2);    // true
isEven(3);    // false

// Works with zero
isEven(0);    // true

// Works with negative numbers
isEven(-4);   // true
isEven(-7);   // false

// Handles large numbers
isEven(1000); // true
```

## API

### `isEven(num: number): boolean`

Checks if a number is even.

**Parameters:**
- `num` (number): The number to check

**Returns:**
- `boolean`: `true` if the number is even, `false` otherwise

**Example:**
```typescript
const numbers = [1, 2, 3, 4, 5];
const evenNumbers = numbers.filter(isEven);
console.log(evenNumbers); // [2, 4]
```

## Development

```sh
# Build the library
npx nx build is-even

# Run type checking
npx nx typecheck is-even
# Run tests
npx nx test is-even

# Publish to JSR
npx nx publish is-even
```
