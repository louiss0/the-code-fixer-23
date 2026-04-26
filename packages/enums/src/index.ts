export type EnumKind = 'string' | 'number' | 'symbol';

export type EnumValue<TKind extends EnumKind> = TKind extends 'string'
  ? string
  : TKind extends 'number'
  ? number
  : symbol;

export type EnumShape<
  TKind extends EnumKind,
  TName extends string = string
> = Readonly<Record<TName, EnumValue<TKind>>>;

export type EnumHelpers<
  TKind extends EnumKind,
  TName extends string = string
> = {
  entries: readonly [TName, EnumValue<TKind>][];
  hasLabel(label: string): boolean;
  labelOf(value: EnumValue<TKind>): string | undefined;
  labels: Readonly<Record<TName, TName>>;
  names: readonly TName[];
  parse(label: string): EnumValue<TKind> | ParseError;
  validate(value: unknown): value is EnumValue<TKind>;
  values: EnumShape<TKind, TName>;
};

export type EnumDefinition<
  TKind extends EnumKind,
  TName extends string = string
> = EnumShape<TKind, TName> & EnumHelpers<TKind, TName>;

export type EnumLabels<TValue extends string = string> = Record<TValue, string>;

export type LabeledEnum<TValue extends string = string> = Readonly<
  Record<TValue, TValue>
> & {
  entries: readonly [TValue, TValue][];
  hasLabel(label: string): boolean;
  labelOf(value: string): string | undefined;
  labels: EnumLabels<TValue>;
  names: readonly TValue[];
  parse(label: string): TValue | ParseError;
  validate(value: unknown): value is TValue;
  values: Readonly<Record<TValue, TValue>>;
};

export class ParseError extends Error {
  readonly input: string;

  constructor(input: string, message = 'Could not parse enum label.') {
    super(message);
    this.input = input;
    this.name = 'ParseError';
  }
}

export function isParseError(value: unknown): value is ParseError {
  return value instanceof ParseError;
}

export function createEnum<TKind extends EnumKind, const TName extends string>(
  kind: TKind,
  ...names: TName[]
): EnumDefinition<TKind, TName> {
  assertUniqueValues(names, 'Enum names must be unique.');

  const values = Object.freeze(
    Object.fromEntries(
      names.map((name, index) => [name, createEnumValue(kind, name, index)])
    )
  ) as EnumShape<TKind, TName>;

  const labels = Object.freeze(
    Object.fromEntries(names.map((name) => [name, name]))
  ) as Readonly<Record<TName, TName>>;
  const entries = Object.freeze(
    names.map((name) => [name, values[name]])
  ) as readonly [TName, EnumValue<TKind>][];
  const parsedValues = new Map(
    names.map((name) => [name, values[name]])
  ) as ReadonlyMap<string, EnumValue<TKind>>;
  const valueLabels = new Map(
    names.map((name) => [values[name], name])
  ) as ReadonlyMap<EnumValue<TKind>, TName>;
  const valuesSet = new Set(Object.values(values)) as ReadonlySet<
    EnumValue<TKind>
  >;

  const api = Object.freeze({
    ...values,
    values,
    labels,
    names: Object.freeze([...names]) as readonly TName[],
    entries,
    parse(label: string) {
      return parsedValues.get(label) ?? new ParseError(label);
    },
    hasLabel(label: string) {
      return parsedValues.has(label);
    },
    labelOf(value: EnumValue<TKind>) {
      return valueLabels.get(value);
    },
    validate(value: unknown): value is EnumValue<TKind> {
      return valuesSet.has(value as EnumValue<TKind>);
    },
  });

  return createImmutableEnumProxy(api, values) as EnumDefinition<TKind, TName>;
}

export function createLabeledEnum<const TValue extends string>(
  labels: EnumLabels<TValue>
): LabeledEnum<TValue> {
  const names = Object.keys(labels) as TValue[];
  const labelValues = Object.values(labels) as string[];

  assertNoReservedEnumKeys(names);
  assertUniqueValues(labelValues, 'Enum labels must be unique.');

  const values = Object.freeze(
    Object.fromEntries(names.map((name) => [name, name]))
  ) as Readonly<Record<TValue, TValue>>;

  const valuesSet = new Set(names);
  const labelsMap = Object.freeze({ ...labels });
  const entries = Object.freeze(
    names.map((name) => [name, values[name]])
  ) as readonly [TValue, TValue][];
  const parsedValues = new Map(
    names.map((name) => [labels[name], values[name]])
  );
  const valueLabels = new Map(
    names.map((name) => [values[name], labels[name]])
  );

  const api = Object.freeze({
    ...values,
    values,
    labels: labelsMap,
    names: Object.freeze([...names]) as readonly TValue[],
    entries,
    parse(label: string) {
      return parsedValues.get(label) ?? new ParseError(label);
    },
    hasLabel(label: string) {
      return parsedValues.has(label);
    },
    labelOf(value: string) {
      return valueLabels.get(value as TValue);
    },
    validate(value: unknown): value is TValue {
      return valuesSet.has(value as TValue);
    },
  });

  return createImmutableEnumProxy(
    api,
    values,
    'Cannot assign to immutable labeled enum property "{property}".'
  ) as LabeledEnum<TValue>;
}

function createImmutableEnumProxy<T extends object>(
  target: T,
  values?: object,
  otherPropertyMessage = 'Cannot assign to immutable enum property "{property}".'
): T {
  const immutableValues = values ?? target;

  return new Proxy(target, {
    set(_target, property) {
      if (typeof property === 'string' && property in immutableValues) {
        throw new Error(`Cannot assign to immutable enum key "${property}".`);
      }

      throw new Error(
        otherPropertyMessage.replace('{property}', String(property))
      );
    },
  });
}

function createEnumValue<TKind extends EnumKind>(
  kind: TKind,
  name: string,
  index: number
): EnumValue<TKind> {
  if (kind === 'string') {
    return name as EnumValue<TKind>;
  }

  if (kind === 'number') {
    return index as EnumValue<TKind>;
  }

  return Symbol.for(`@code-fixer-23/enums/${name}`) as EnumValue<TKind>;
}

const reservedLabeledEnumKeys = new Set([
  'entries',
  'hasLabel',
  'labelOf',
  'labels',
  'names',
  'parse',
  'validate',
  'values',
]);

function assertNoReservedEnumKeys(keys: readonly string[]) {
  if (keys.some((key) => reservedLabeledEnumKeys.has(key))) {
    throw new Error('Enum keys cannot use reserved helper names.');
  }
}

function assertUniqueValues(values: readonly string[], message: string) {
  if (new Set(values).size !== values.length) {
    throw new Error(message);
  }
}
