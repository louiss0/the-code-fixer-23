# @code-fixer-23/enums

Typed enum factories for immutable TypeScript-friendly enum objects. Use it when
you want property access, literal inference, runtime validation, and label
parsing without reaching for TypeScript `enum`.

## Installation

```sh
pnpm add @code-fixer-23/enums
```

## Quick Start

```ts
import { createEnum, createLabeledEnum, isParseError } from '@code-fixer-23/enums';

const status = createEnum('string', 'draft', 'published');
status.draft;
// 'draft'

const priority = createLabeledEnum({
  low: 'Low',
  high: 'High',
});

const parsedPriority = priority.parse('High');
if (!isParseError(parsedPriority)) {
  parsedPriority;
  // 'high'
}
```

## `createEnum(kind, ...names)`

Create immutable enum values from member names.

```ts
import { createEnum } from '@code-fixer-23/enums';

const color = createEnum('string', 'red', 'blue');
color.red;
// 'red'

const status = createEnum('number', 'pending', 'done');
status.pending;
// 0

const role = createEnum('symbol', 'admin', 'editor');
role.admin;
// Symbol.for('@code-fixer-23/enums/admin')
```

### Kinds

- `string` uses each member name as its value.
- `number` assigns zero-based numeric values in declaration order.
- `symbol` creates global symbols with `Symbol.for('@code-fixer-23/enums/<name>')`.
- Duplicate member names are rejected.
- Enum member properties are immutable at runtime.

## `createLabeledEnum(labels)`

Create labeled string enums from caller-provided key/value pairs. The returned
enum uses a Proxy so enum values and helper methods are available on the same
object.

```ts
import {
  ParseError,
  createLabeledEnum,
  isParseError,
} from '@code-fixer-23/enums';

const priority = createLabeledEnum({
  low: 'Low',
  high: 'High',
});

priority.low;
// 'low'

priority.values.low;
// 'low'

priority.labels.high;
// 'High'

const parsedPriority = priority.parse('High');
// 'high'

const missingPriority = priority.parse('Urgent');
if (isParseError(missingPriority)) {
  missingPriority.name;
  // 'ParseError'
}

priority.validate('low');
// true

priority.validate('urgent');
// false

priority.names;
// ['low', 'high']

priority.entries;
// [['low', 'low'], ['high', 'high']]

priority.hasLabel('Low');
// true

priority.labelOf('high');
// 'High'
```

### Labeled enum API

A labeled enum returns:

- direct enum value properties such as `priority.low`
- `values`: the generated enum values
- `labels`: the original label map
- `names`: the member names in declaration order
- `entries`: `[name, value]` tuples in declaration order
- `parse(label)`: returns the matching enum value or a `ParseError`
- `hasLabel(label)`: returns `true` when the label exists
- `labelOf(value)`: returns the matching label, or `undefined`
- `validate(value)`: returns `true` when the value belongs to the enum
- Duplicate labels are rejected to keep parsing unambiguous.
- Reserved helper names such as `parse`, `values`, and `labels` are rejected as
  enum keys.

### Parse errors

Parsing never throws. Instead, parse failures return a `ParseError` value:

```ts
const result = priority.parse('Urgent');

if (result instanceof ParseError) {
  console.log(result.message);
}
```

## Package Format

This package publishes ESM with generated TypeScript declarations:

- Runtime entrypoint: `dist/index.js`
- Type declarations: `dist/index.d.ts`
- Package export: `@code-fixer-23/enums`

## Development

```sh
pnpm nx typecheck enums
pnpm nx test enums
pnpm nx build enums
```
