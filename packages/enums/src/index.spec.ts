import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  type EnumSymbol,
  ParseError,
  createEnum,
  createLabeledEnum,
  isParseError,
} from './index.js';

describe('createEnum', () => {
  it('infers literal keys and values for string enums', () => {
    const color = createEnum('string', 'red', 'blue');

    expectTypeOf(color.red).toEqualTypeOf<'red'>();
    expectTypeOf(color.blue).toEqualTypeOf<'blue'>();
    expectTypeOf(color).toExtend<
      Readonly<{
        red: 'red';
        blue: 'blue';
      }>
    >();
  });

  it('creates string enums from member names', () => {
    const color = createEnum('string', 'red', 'blue');

    expect(color.red).toBe('red');
    expect(color.blue).toBe('blue');
  });

  it('creates number enums from member names', () => {
    const status = createEnum('number', 'pending', 'done');

    expect(status.pending).toBe(0);
    expect(status.done).toBe(1);
  });

  it('infers ordinal literal values for number enums', () => {
    const status = createEnum('number', 'pending', 'done');

    expectTypeOf(status.pending).toEqualTypeOf<0>();
    expectTypeOf(status.done).toEqualTypeOf<1>();
    expectTypeOf(status).toExtend<
      Readonly<{
        pending: 0;
        done: 1;
      }>
    >();
  });

  it('creates symbol enums from member names', () => {
    const role = createEnum('symbol', 'admin', 'editor');

    expect(role.admin).toBe(Symbol.for('@code-fixer-23/enums/admin'));
    expect(role.editor).toBe(Symbol.for('@code-fixer-23/enums/editor'));
  });

  it('brands symbol enums by member and declaration', () => {
    const role = createEnum('symbol', 'admin', 'editor');
    const status = createEnum('symbol', 'pending', 'done');

    expectTypeOf(role.admin).toExtend<
      EnumSymbol<readonly ['admin', 'editor'], 'admin'>
    >();
    expectTypeOf(role.editor).toExtend<
      EnumSymbol<readonly ['admin', 'editor'], 'editor'>
    >();
    expectTypeOf(role.admin).toExtend<symbol>();
    expectTypeOf(status.pending).toExtend<
      EnumSymbol<readonly ['pending', 'done'], 'pending'>
    >();
  });

  it('keeps enum keys immutable through the proxy', () => {
    const color = createEnum('string', 'red', 'blue');

    expect(() => {
      Reflect.set(color, 'blue', 'changed');
    }).toThrowError('Cannot assign to immutable enum key "blue".');
    expect(color.red).toBe('red');
    expect(color.blue).toBe('blue');
  });

  it('freezes enum values', () => {
    const color = createEnum('string', 'red', 'blue');

    expect(Object.isFrozen(color)).toBe(true);
  });

  it('rejects duplicate member names', () => {
    expect(() => createEnum('string', 'red', 'red')).toThrowError(
      'Enum names must be unique.'
    );
  });
});

describe('createLabeledEnum', () => {
  it('infers literal string values and labels for labeled enums', () => {
    const articleStatus = createLabeledEnum({
      draft: 'Draft',
      published: 'Published',
    });

    expectTypeOf(articleStatus.draft).toEqualTypeOf<'draft'>();
    expectTypeOf(articleStatus.published).toEqualTypeOf<'published'>();
    expectTypeOf(articleStatus.labels.draft).toEqualTypeOf<'Draft'>();
    expectTypeOf(articleStatus.labels.published).toEqualTypeOf<'Published'>();
    expectTypeOf(articleStatus.parse('Draft')).toEqualTypeOf<'draft'>();
    expectTypeOf(articleStatus.parse('Published')).toEqualTypeOf<'published'>();
    expectTypeOf(
      articleStatus.labelOf(articleStatus.draft)
    ).toEqualTypeOf<'Draft'>();
    expectTypeOf(
      articleStatus.labelOf(articleStatus.published)
    ).toEqualTypeOf<'Published'>();
  });

  it('exposes enum values as direct properties alongside methods', () => {
    const articleStatus = createLabeledEnum({
      draft: 'Draft',
      published: 'Published',
    });

    expect(articleStatus.draft).toBe('draft');
    expect(articleStatus.published).toBe('published');
    expect(articleStatus.labels).toEqual({
      draft: 'Draft',
      published: 'Published',
    });
    expect(articleStatus.parse('Published')).toBe(articleStatus.published);
    expect(articleStatus.validate(articleStatus.draft)).toBe(true);
    expect(articleStatus.validate('archived')).toBe(false);
  });

  it('keeps enum keys immutable', () => {
    const articleStatus = createLabeledEnum({
      draft: 'Draft',
      published: 'Published',
    });

    expect(() => {
      Reflect.set(articleStatus, 'published', 'changed');
    }).toThrowError('Cannot assign to immutable enum key "published".');
    expect(articleStatus.draft).toBe('draft');
    expect(articleStatus.published).toBe('published');
  });

  it('returns a ParseError when a label cannot be parsed', () => {
    const articleStatus = createLabeledEnum({
      draft: 'Draft',
      published: 'Published',
    });

    const parseResult = articleStatus.parse('Archived');

    expect(parseResult).toBeInstanceOf(ParseError);
    expect(isParseError(parseResult)).toBe(true);
    expect(parseResult).toBeInstanceOf(Error);
    expect(parseResult).toMatchObject({
      input: 'Archived',
      message: 'Could not parse enum label.',
      name: 'ParseError',
    });
  });

  it('exposes names and entries for iteration', () => {
    const articleStatus = createLabeledEnum({
      draft: 'Draft',
      published: 'Published',
    });

    expect(articleStatus.names).toEqual(['draft', 'published']);
    expect(articleStatus.entries).toEqual([
      ['draft', 'draft'],
      ['published', 'published'],
    ]);
  });

  it('looks up labels and checks whether labels exist', () => {
    const articleStatus = createLabeledEnum({
      draft: 'Draft',
      published: 'Published',
    });

    expect(articleStatus.labelOf(articleStatus.published)).toBe('Published');
    expect(articleStatus.labelOf('archived')).toBeUndefined();
    expect(articleStatus.hasLabel('Draft')).toBe(true);
    expect(articleStatus.hasLabel('Archived')).toBe(false);
  });

  it('rejects duplicate labels', () => {
    expect(() =>
      createLabeledEnum({
        draft: 'Shared',
        published: 'Shared',
      })
    ).toThrowError('Enum labels must be unique.');
  });

  it('rejects helper-name collisions in enum keys', () => {
    expect(() =>
      createLabeledEnum({
        parse: 'Parse',
      })
    ).toThrowError('Enum keys cannot use reserved helper names.');
  });
});
