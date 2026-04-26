import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  ParseError,
  createEnum,
  createLabeledEnum,
  isParseError,
} from './index';

describe('createEnum', () => {
  it('creates string enums from names', () => {
    const values = createEnum('string', 'Draft', 'Published');

    expect(values.Draft).toBe('Draft');
    expect(values.Published).toBe('Published');
    expectTypeOf(values.Draft).toEqualTypeOf<'Draft'>();
    expectTypeOf(values.Published).toEqualTypeOf<'Published'>();
  });

  it('exposes literal helpers for string enums', () => {
    const values = createEnum('string', 'Draft', 'Published');

    expect(values.parse('Draft')).toBe('Draft');
    expect(values.validate('Draft')).toBe(true);
    expect(values.labels).toEqual({
      Draft: 'Draft',
      Published: 'Published',
    });
    expect(values.entries).toEqual([
      ['Draft', 'Draft'],
      ['Published', 'Published'],
    ]);
  });

  it('creates numbered enums by declaration order', () => {
    const values = createEnum('number', 'Low', 'High');

    expect(values.Low).toBe(0);
    expect(values.High).toBe(1);
    expectTypeOf(values.Low).toEqualTypeOf<0>();
    expectTypeOf(values.High).toEqualTypeOf<1>();
  });

  it('exposes literal helpers for number enums', () => {
    const values = createEnum('number', 'Low', 'High');

    expect(values.parse('Low')).toBe(0);
    expect(values.validate(0)).toBe(true);
    expectTypeOf(values.parse('Low')).toEqualTypeOf<0 | 1 | ParseError>();
  });

  it('creates symbol enums by declaration order', () => {
    const values = createEnum('symbol', 'CEO', 'CFO');

    expect(values.CEO).toBeTypeOf('symbol');
    expect(values.CFO).toBeTypeOf('symbol');
  });

  it('exposes literal helpers for symbol enums', () => {
    const values = createEnum('symbol', 'CEO', 'CFO');

    expect(values.parse('CEO')).toBe(values.CEO);
    expect(values.validate(values.CEO)).toBe(true);
  });

  it('returns a parse error for unknown enum labels', () => {
    const values = createEnum('number', 'Low');

    const result = values.parse('Missing');

    expect(isParseError(result)).toBe(true);
    expect(result).toBeInstanceOf(ParseError);
  });
});

describe('createLabeledEnum', () => {
  it('exposes literal helpers', () => {
    const status = createLabeledEnum({
      draft: 'Draft',
      published: 'Published',
    });

    expect(status.parse('Draft')).toBe('draft');
    expect(status.validate('draft')).toBe(true);
    expectTypeOf(status.draft).toEqualTypeOf<'draft'>();
    expectTypeOf(status.published).toEqualTypeOf<'published'>();
  });

  it('returns a parse error for unknown labels', () => {
    const status = createLabeledEnum({
      draft: 'Draft',
    });

    const result = status.parse('Missing');

    expect(isParseError(result)).toBe(true);
    expect(result).toBeInstanceOf(ParseError);
  });
});
