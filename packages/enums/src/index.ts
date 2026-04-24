export type EnumKind = 'string' | 'number' | 'symbol';

export type EnumValue<TKind extends EnumKind> =
  TKind extends 'string'
    ? string
    : TKind extends 'number'
      ? number
      : symbol;

export type EnumShape<
  TKind extends EnumKind,
  TName extends string = string,
> = Record<TName, EnumValue<TKind>>;

export type EnumLabels<TValue extends string = string> = Record<TValue, string>;

export class ParseError extends Error {
  readonly input: string;

  constructor(input: string, message = 'Could not parse enum label.') {
    super(message);
    this.input = input;
    this.name = 'ParseError';
  }
}

export type LabeledEnum<TValue extends string = string> =
  Readonly<Record<TValue, TValue>> & {
    entries: readonly [TValue, TValue][];
    hasLabel(label: string): boolean;
    labelOf(value: string): string | undefined;
    labels: EnumLabels<TValue>;
    names: readonly TValue[];
    parse(label: string): TValue | ParseError;
    validate(value: unknown): value is TValue;
    values: Readonly<Record<TValue, TValue>>;
  };

export function isParseError(value: unknown): value is ParseError {
  return value instanceof ParseError;
}

export function createEnum<
  TKind extends EnumKind,
  const TName extends string,
>(kind: TKind, ...names: TName[]): EnumShape<TKind, TName> {
  assertUniqueValues(names, 'Enum names must be unique.');

  const entries = names.map((name, index) => [
    name,
    createEnumValue(kind, name, index),
  ] as const);

  return Object.freeze(
    Object.fromEntries(entries)
  ) as EnumShape<TKind, TName>;
}

export function createLabeledEnum<const TValue extends string>(
  labels: EnumLabels<TValue>
): LabeledEnum<TValue> {
  const names = Object.keys(labels) as TValue[];
  const labelValues = Object.values(labels) as string[];

  assertUniqueValues(labelValues, 'Enum labels must be unique.');

  const values = Object.freeze(
    Object.fromEntries(names.map((name) => [name, name] as const))
  ) as Readonly<Record<TValue, TValue>>;
  const valuesSet = new Set<TValue>(names);
  const labelsMap = Object.freeze({ ...labels });
  const entries = Object.freeze(
    names.map((name) => [name, values[name]] as [TValue, TValue])
  );
  const parsedValues = new Map<string, TValue>(
    names.map((name) => [labels[name], values[name]] as const)
  );
  const valueLabels = new Map<TValue, string>(
    names.map((name) => [values[name], labels[name]] as const)
  );
  const api = Object.freeze({
    values,
    labels: labelsMap,
    names: Object.freeze([...names]),
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

  return new Proxy(api, {
    get(target, property, receiver) {
      if (typeof property === 'string' && property in values) {
        return values[property as TValue];
      }

      return Reflect.get(target, property, receiver);
    },
    has(target, property) {
      if (typeof property === 'string' && property in values) {
        return true;
      }

      return Reflect.has(target, property);
    },
    ownKeys(target) {
      const propertyKeys = Reflect.ownKeys(target);
      const valueKeys = names.filter((name) => !propertyKeys.includes(name));

      return [...valueKeys, ...propertyKeys];
    },
    getOwnPropertyDescriptor(target, property) {
      if (typeof property === 'string' && property in values) {
        return {
          configurable: true,
          enumerable: true,
          value: values[property as TValue],
          writable: false,
        };
      }

      return Reflect.getOwnPropertyDescriptor(target, property);
    },
  }) as LabeledEnum<TValue>;
}

function createEnumValue(kind: EnumKind, name: string, index: number) {
  if (kind === 'string') {
    return name;
  }

  if (kind === 'number') {
    return index;
  }

  return Symbol.for(`@code-fixer-23/enums/${name}`);
}

function assertUniqueValues(values: readonly string[], message: string) {
  if (new Set(values).size !== values.length) {
    throw new Error(message);
  }
}
