import { describe, expect, it } from 'vitest';
import {
  ParseError,
  createEnum,
  createLabeledEnum,
  isParseError,
} from './index.js';

describe('createEnum', () => {
  it('creates string enums from member names', () => {
    const color = createEnum('string', 'red', 'blue');

    expect(color).toEqual({
      red: 'red',
      blue: 'blue',
    });
  });

  it('creates number enums from member names', () => {
    const status = createEnum('number', 'pending', 'done');

    expect(status).toEqual({
      pending: 0,
      done: 1,
    });
  });

  it('creates symbol enums from member names', () => {
    const role = createEnum('symbol', 'admin', 'editor');

    expect(role.admin).toBe(Symbol.for('@code-fixer-23/enums/admin'));
    expect(role.editor).toBe(Symbol.for('@code-fixer-23/enums/editor'));
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
  it('uses caller-provided values and labels', () => {
    const articleStatus = createLabeledEnum({
      draft: 'Draft',
      published: 'Published',
    });

    expect(articleStatus.values).toEqual({
      draft: 'draft',
      published: 'published',
    });
    expect(articleStatus.labels).toEqual({
      draft: 'Draft',
      published: 'Published',
    });
    expect(articleStatus.parse('Published')).toBe('published');
    expect(articleStatus.validate('draft')).toBe(true);
    expect(articleStatus.validate('archived')).toBe(false);
  });

  it('returns a ParseError when a label cannot be parsed', () => {
    const articleStatus = createLabeledEnum({
      draft: 'Draft',
      published: 'Published',
    });

    const parseResult = articleStatus.parse('Archived');

    expect(parseResult).toBeInstanceOf(ParseError);
    expect(isParseError(parseResult)).toBe(true);
    expect(parseResult).toMatchObject({
      input: 'Archived',
      message: 'Could not parse enum label.',
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

    expect(articleStatus.labelOf('published')).toBe('Published');
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
});
