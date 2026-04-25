import { describe, expect, it } from 'vitest';

import {
  ParseError,
  createEnum,
  createLabeledEnum,
  isParseError,
} from './index.js';

describe('createEnum', () => {
  it('creates string enums from names', () => {
    const values = createEnum('string', 'Draft', 'Published');

    expect(values.Draft).toBe('Draft');
    expect(values.Published).toBe('Published');
  });

  it('creates numbered enums by declaration order', () => {
    const values = createEnum('number', 'Low', 'High');

    expect(values.Low).toBe(0);
    expect(values.High).toBe(1);
  });
});

describe('createLabeledEnum', () => {
  it('exposes labeled enum helpers', () => {
    const status = createLabeledEnum({
      draft: 'Draft',
      published: 'Published',
    });

    expect(status.parse('Draft')).toBe('draft');
    expect(status.labelOf('published')).toBe('Published');
    expect(status.validate('draft')).toBe(true);
    expect(status.hasLabel('Published')).toBe(true);
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
