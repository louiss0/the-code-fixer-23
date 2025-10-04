# @the-code-fixer-23/tsup-test-none-biome

E2E test lib with none+biome

## Installation

```sh
# Using pnpm
pnpm add @the-code-fixer-23/tsup-test-none-biome

# Or using JPD if available
jpd add @the-code-fixer-23/tsup-test-none-biome
```

## Usage

```typescript
import { hello } from '@the-code-fixer-23/tsup-test-none-biome';

console.log(hello());
```

## Development

```sh
# Build the library
npx nx build tsup-test-none-biome

# Run type checking
npx nx typecheck tsup-test-none-biome
# Lint
npx nx lint tsup-test-none-biome
```
