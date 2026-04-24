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

export type EnumLabels<TName extends string = string> = Record<TName, string>;

export type LabeledEnum<
  TKind extends EnumKind,
  TName extends string = string,
> = {
  entries: readonly [TName, EnumValue<TKind>][];
  hasLabel(label: string): boolean;
  labelOf(value: EnumValue<TKind>): string | undefined;
  labels: EnumLabels<TName>;
  names: readonly TName[];
  parse(label: string): EnumValue<TKind> | undefined;
  validate(value: unknown): value is EnumValue<TKind>;
  values: EnumShape<TKind, TName>;
};

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

export function createLabeledEnum<
  TKind extends EnumKind,
  const TName extends string,
>(kind: TKind, labels: EnumLabels<TName>): LabeledEnum<TKind, TName> {
  const names = Object.keys(labels) as TName[];
  const labelValues = Object.values(labels);

  assertUniqueValues(labelValues, 'Enum labels must be unique.');

  const values = createEnum(kind, ...names);
  const valuesSet = new Set(Object.values(values));
  const labelsMap = Object.freeze({ ...labels });
  const entries = Object.freeze(
    names.map((name) => [name, values[name]] as [TName, EnumValue<TKind>])
  );
  const parsedEntries = names.map(
    (name) => [labels[name], values[name]] as const
  );
  const parsedValues = new Map<string, EnumValue<TKind>>(parsedEntries);
  const valueLabels = new Map<EnumValue<TKind>, string>(
    names.map((name) => [values[name], labels[name]] as const)
  );

  return Object.freeze({
    values,
    labels: labelsMap,
    names: Object.freeze([...names]),
    entries,
    parse(label: string) {
      return parsedValues.get(label);
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
