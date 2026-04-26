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

type EnumLiteralValue<
  TKind extends EnumKind,
  TName extends string,
  TIndex extends number
> = TKind extends 'string'
  ? TName
  : TKind extends 'number'
  ? TIndex
  : symbol;

type EnumLiteralValues<
  TKind extends EnumKind,
  TNames extends readonly string[],
  TIndex extends unknown[] = []
> = TNames extends readonly [infer TName extends string, ...infer TRest extends string[]]
  ? {
      readonly [K in TName]: EnumLiteralValue<
        TKind,
        K,
        TIndex['length']
      >;
    } & EnumLiteralValues<TKind, TRest, [...TIndex, unknown]>
  : {};

type EnumLiteralValueUnion<
  TKind extends EnumKind,
  TNames extends readonly string[],
  TIndex extends unknown[] = []
> = TNames extends readonly [infer TName extends string, ...infer TRest extends string[]]
  ? EnumLiteralValue<TKind, TName, TIndex['length']> |
      EnumLiteralValueUnion<TKind, TRest, [...TIndex, unknown]>
  : never;

export type EnumHelpers<
  TKind extends EnumKind,
  TNames extends readonly string[] = readonly string[]
> = {
  entries: readonly [TNames[number], EnumLiteralValueUnion<TKind, TNames>][];
  labels: Readonly<Record<TNames[number], TNames[number]>>;
  names: readonly [...TNames];
  parse(label: string): EnumLiteralValueUnion<TKind, TNames> | ParseError;
  validate(value: unknown): value is EnumLiteralValueUnion<TKind, TNames>;
  values: EnumLiteralValues<TKind, TNames>;
};

export type EnumDefinition<
  TKind extends EnumKind,
  TNames extends readonly string[] = readonly string[]
> = EnumLiteralValues<TKind, TNames> & EnumHelpers<TKind, TNames>;

export type EnumLabels<TValue extends string = string> = Record<TValue, string>;

export type LabeledEnum<TValue extends string = string> = Readonly<
  Record<TValue, TValue>
> & {
  entries: readonly [TValue, TValue][];
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

export function createEnum<
  TKind extends EnumKind,
  const TNames extends readonly string[]
>(kind: TKind, ...names: TNames): EnumDefinition<TKind, TNames> {
  assertUniqueValues(names, 'Enum names must be unique.');

  const mutableValues = {} as EnumLiteralValues<TKind, TNames>;
  const mutableValuesRecord = mutableValues as unknown as Record<
    TNames[number],
    EnumLiteralValueUnion<TKind, TNames>
  >;
  const mutableLabels = {} as Record<TNames[number], TNames[number]>;
  const entries: [TNames[number], EnumLiteralValueUnion<TKind, TNames>][] = [];
  const parsedValues = new Map<string, EnumLiteralValueUnion<TKind, TNames>>();

  for (const [index, name] of names.entries()) {
    const key = name as TNames[number];
    const value = createEnumValue(kind, name, index) as EnumLiteralValueUnion<
      TKind,
      TNames
    >;

    mutableValuesRecord[key] = value;
    mutableLabels[key] = key;
    entries.push([key, value]);
    parsedValues.set(name, value);
  }

  const values = Object.freeze(mutableValues);
  const labels = Object.freeze(mutableLabels) as Readonly<
    Record<TNames[number], TNames[number]>
  >;
  const valuesSet = new Set(Object.values(values)) as ReadonlySet<
    EnumLiteralValueUnion<TKind, TNames>
  >;

  const api = Object.freeze({
    ...values,
    values,
    labels,
    names: Object.freeze([...names]) as readonly [...TNames],
    entries: Object.freeze(entries) as readonly [
      TNames[number],
      EnumLiteralValueUnion<TKind, TNames>
    ][],
    parse(label: string) {
      return parsedValues.get(label) ?? new ParseError(label);
    },
    validate(value: unknown): value is EnumLiteralValueUnion<
      TKind,
      TNames
    > {
      return valuesSet.has(value as EnumLiteralValueUnion<TKind, TNames>);
    },
  });

  return createImmutableEnumProxy(api, values) as EnumDefinition<TKind, TNames>;
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

  const api = Object.freeze({
    ...values,
    values,
    labels: labelsMap,
    names: Object.freeze([...names]) as readonly TValue[],
    entries,
    parse(label: string) {
      return parsedValues.get(label) ?? new ParseError(label);
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
