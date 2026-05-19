export type EnumKind = "string" | "number" | "symbol";

export type EnumValue<TKind extends EnumKind> = TKind extends "string"
  ? string
  : TKind extends "number"
    ? number
    : symbol;

declare const enumSymbolBrand: unique symbol;

export type EnumSymbol<
  TNames extends readonly string[],
  TName extends string,
> = symbol & {
  readonly [enumSymbolBrand]: {
    readonly enum: TNames;
    readonly member: TName;
  };
};

type TupleIndexKey<TValue extends readonly unknown[]> = Exclude<
  keyof TValue,
  keyof (readonly unknown[])
>;

type TupleIndexNumber<TValue> = TValue extends `${infer TNumber extends number}`
  ? TNumber
  : never;

type IsTuple<TValue extends readonly unknown[]> =
  number extends TValue["length"] ? false : true;

type EnumMemberValue<
  TKind extends EnumKind,
  TNames extends readonly string[],
  TIndex extends TupleIndexKey<TNames>,
> = TKind extends "string"
  ? TNames[TIndex]
  : TKind extends "number"
    ? TupleIndexNumber<TIndex>
    : EnumSymbol<TNames, Extract<TNames[TIndex], string>>;

export type EnumShapeFromNames<
  TKind extends EnumKind,
  TNames extends readonly string[],
> = IsTuple<TNames> extends true
  ? Readonly<{
      [TIndex in TupleIndexKey<TNames> as Extract<
        TNames[TIndex],
        string
      >]: EnumMemberValue<TKind, TNames, TIndex>;
    }>
  : Readonly<Record<string, EnumValue<TKind>>>;

export type EnumLabels<TValue extends string = string> = Record<TValue, string>;

type EnumLabelKey<TLabels extends Record<string, string>> = Extract<
  keyof TLabels,
  string
>;

type EnumLabelValue<TLabels extends Record<string, string>> =
  TLabels[EnumLabelKey<TLabels>];

type EnumLabelKeyForValue<
  TLabels extends Record<string, string>,
  TLabel extends EnumLabelValue<TLabels>,
> = {
  [TKey in EnumLabelKey<TLabels>]: TLabels[TKey] extends TLabel ? TKey : never;
}[EnumLabelKey<TLabels>];

type LabeledEnumMemberValue<
  TLabels extends Record<string, string>,
  TKey extends EnumLabelKey<TLabels>,
> = TKey;

type LabeledEnumValues<TLabels extends Record<string, string>> = Readonly<{
  [TKey in EnumLabelKey<TLabels>]: LabeledEnumMemberValue<TLabels, TKey>;
}>;

type LabeledEnumEntries<TLabels extends Record<string, string>> = readonly {
  [TKey in EnumLabelKey<TLabels>]: readonly [
    TKey,
    LabeledEnumMemberValue<TLabels, TKey>,
  ];
}[EnumLabelKey<TLabels>][];

type ParseValueResult<
  TLabels extends Record<string, string>,
  TLabel extends string,
> = string extends EnumLabelValue<TLabels>
  ? LabeledEnumMemberValue<TLabels, EnumLabelKey<TLabels>> | ParseError
  : TLabel extends EnumLabelValue<TLabels>
    ? LabeledEnumMemberValue<TLabels, EnumLabelKeyForValue<TLabels, TLabel>>
    : LabeledEnumMemberValue<TLabels, EnumLabelKey<TLabels>> | ParseError;

export class ParseError extends Error {
  readonly input: string;

  constructor(input: string, message = "Could not parse enum label.") {
    super(message);
    this.input = input;
    this.name = "ParseError";
  }
}

export type LabeledEnum<TLabels extends Record<string, string>> =
  LabeledEnumValues<TLabels> & {
    entries: readonly {
      [TKey in EnumLabelKey<TLabels>]: [
        TKey,
        LabeledEnumMemberValue<TLabels, TKey>,
      ];
    }[EnumLabelKey<TLabels>][];
    hasLabel(label: string): label is EnumLabelValue<TLabels>;
    labelOf<TValue extends EnumLabelKey<TLabels>>(
      value: LabeledEnumMemberValue<TLabels, TValue>,
    ): TLabels[TValue];
    labelOf(value: string): EnumLabelValue<TLabels> | undefined;
    labels: Readonly<TLabels>;
    names: readonly EnumLabelKey<TLabels>[];
    parse<TLabel extends string>(
      label: TLabel,
    ): ParseValueResult<TLabels, TLabel>;
    validate(
      value: unknown,
    ): value is LabeledEnumMemberValue<TLabels, EnumLabelKey<TLabels>>;
    values: LabeledEnumValues<TLabels>;
  };

export function isParseError(value: unknown): value is ParseError {
  return value instanceof ParseError;
}

export function createEnum<
  TKind extends EnumKind,
  const TNames extends readonly string[],
>(kind: TKind, ...names: TNames): EnumShapeFromNames<TKind, TNames> {
  assertUniqueValues(names, "Enum names must be unique.");

  const values = Object.freeze(
    Object.fromEntries(
      names.map(
        (name, index) => [name, createEnumValue(kind, name, index)] as const,
      ),
    ),
  ) as EnumShapeFromNames<TKind, TNames>;

  return createImmutableEnumProxy(values) as EnumShapeFromNames<TKind, TNames>;
}

export function createLabeledEnum<const TLabels extends Record<string, string>>(
  labels: TLabels,
): LabeledEnum<TLabels> {
  const names = Object.keys(labels) as EnumLabelKey<TLabels>[];
  const labelValues = Object.values(labels) as string[];

  assertNoReservedEnumKeys(names);
  assertUniqueValues(labelValues, "Enum labels must be unique.");

  const values = Object.freeze(
    Object.fromEntries(names.map((name) => [name, name] as const)),
  ) as LabeledEnumValues<TLabels>;
  const valuesSet = new Set(Object.values(values));
  const labelsMap = Object.freeze({ ...labels }) as Readonly<TLabels>;
  const entries = Object.freeze(
    names.map((name) => [name, values[name]] as const),
  ) as LabeledEnumEntries<TLabels>;
  const parsedValues = new Map<
    string,
    LabeledEnumMemberValue<TLabels, EnumLabelKey<TLabels>>
  >(
    names.map(
      (name) => [labels[name], values[name]] as const,
    ) as readonly (readonly [
      string,
      LabeledEnumMemberValue<TLabels, EnumLabelKey<TLabels>>,
    ])[],
  );
  const valueLabels = new Map<
    LabeledEnumMemberValue<TLabels, EnumLabelKey<TLabels>>,
    EnumLabelValue<TLabels>
  >(
    names.map(
      (name) => [values[name], labels[name]] as const,
    ) as readonly (readonly [
      LabeledEnumMemberValue<TLabels, EnumLabelKey<TLabels>>,
      EnumLabelValue<TLabels>,
    ])[],
  );
  const api = Object.freeze({
    ...values,
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
      return valueLabels.get(value as EnumLabelKey<TLabels>);
    },
    validate(
      value: unknown,
    ): value is LabeledEnumMemberValue<TLabels, EnumLabelKey<TLabels>> {
      return valuesSet.has(
        value as LabeledEnumMemberValue<TLabels, EnumLabelKey<TLabels>>,
      );
    },
  });

  return createImmutableEnumProxy(
    api,
    values,
    'Cannot assign to immutable labeled enum property "{property}".',
  ) as LabeledEnum<TLabels>;
}

function createImmutableEnumProxy<
  TValue extends string | number | symbol,
  TObject extends object,
>(
  target: TObject,
  values?: Readonly<Record<string, TValue>>,
  otherPropertyMessage = 'Cannot assign to immutable enum property "{property}".',
) {
  const immutableValues =
    values ?? (target as Readonly<Record<string, TValue>>);

  return new Proxy(target, {
    set(_target, property) {
      if (typeof property === "string" && property in immutableValues) {
        throw new Error(`Cannot assign to immutable enum key "${property}".`);
      }

      throw new Error(
        otherPropertyMessage.replace("{property}", String(property)),
      );
    },
  });
}

function createEnumValue(kind: EnumKind, name: string, index: number) {
  if (kind === "string") {
    return name;
  }

  if (kind === "number") {
    return index;
  }

  return Symbol.for(`@code-fixer-23/enums/${name}`);
}

const reservedLabeledEnumKeys = new Set([
  "entries",
  "hasLabel",
  "labelOf",
  "labels",
  "names",
  "parse",
  "validate",
  "values",
]);

function assertNoReservedEnumKeys(keys: readonly string[]) {
  if (keys.some((key) => reservedLabeledEnumKeys.has(key))) {
    throw new Error("Enum keys cannot use reserved helper names.");
  }
}

function assertUniqueValues(values: readonly string[], message: string) {
  if (new Set(values).size !== values.length) {
    throw new Error(message);
  }
}
