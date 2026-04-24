# @code-fixer-23/enums

Typed enum factories for string, number, and symbol values.

## Installation

```sh
pnpm add @code-fixer-23/enums
```

## `createEnum(kind, ...names)`

Create enum values from member names.

```ts
import { createEnum } from '@code-fixer-23/enums';

const color = createEnum('string', 'red', 'blue');
// { red: 'red', blue: 'blue' }

const status = createEnum('number', 'pending', 'done');
// { pending: 0, done: 1 }

const role = createEnum('symbol', 'admin', 'editor');
// { admin: Symbol.for('@code-fixer-23/enums/admin'), ... }
```

### Kinds

- `string` uses each member name as its value.
- `number` assigns zero-based numeric values in declaration order.
- `symbol` creates global symbols with `Symbol.for('@code-fixer-23/enums/<name>')`.
- duplicate member names are rejected.

## `createLabeledEnum(kind, labels)`

Create enum values alongside user-facing labels and helper methods.

```ts
import { createLabeledEnum } from '@code-fixer-23/enums';

const priority = createLabeledEnum('string', {
  low: 'Low',
  high: 'High',
});

priority.values.low;
// 'low'

priority.labels.high;
// 'High'

priority.parse('High');
// 'high'

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

- `values`: the generated enum values
- `labels`: the original label map
- `names`: the member names in declaration order
- `entries`: `[name, value]` tuples in declaration order
- `parse(label)`: returns the matching enum value, or `undefined`
- `hasLabel(label)`: returns `true` when the label exists
- `labelOf(value)`: returns the matching label, or `undefined`
- `validate(value)`: returns `true` when the value belongs to the enum
- duplicate labels are rejected to keep parsing unambiguous

## Development

```sh
pnpm nx test enums
pnpm nx build enums
pnpm nx typecheck enums
```
