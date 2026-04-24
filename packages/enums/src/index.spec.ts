import { describe, expect, it } from 'vitest';
import { createEnum, createLabeledEnum } from './index.js';

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
  it('creates labeled string enums with parse and validate helpers', () => {
    const priority = createLabeledEnum('string', {
      low: 'Low',
      high: 'High',
    });

    expect(priority.values).toEqual({
      low: 'low',
      high: 'high',
    });
    expect(priority.labels).toEqual({
      low: 'Low',
      high: 'High',
    });
    expect(priority.parse('High')).toBe('high');
    expect(priority.validate('low')).toBe(true);
    expect(priority.validate('urgent')).toBe(false);
  });

  it('parses and validates symbol enum values by label', () => {
    const role = createLabeledEnum('symbol', {
      admin: 'Administrator',
      editor: 'Editor',
    });

    expect(role.parse('Administrator')).toBe(
      Symbol.for('@code-fixer-23/enums/admin')
    );
    expect(role.parse('Missing')).toBeUndefined();
    expect(role.validate(role.values.editor)).toBe(true);
    expect(role.validate(Symbol('editor'))).toBe(false);
  });

  it('exposes names and entries for iteration', () => {
    const priority = createLabeledEnum('string', {
      low: 'Low',
      high: 'High',
    });

    expect(priority.names).toEqual(['low', 'high']);
    expect(priority.entries).toEqual([
      ['low', 'low'],
      ['high', 'high'],
    ]);
  });

  it('rejects duplicate labels', () => {
    expect(() =>
      createLabeledEnum('string', {
        low: 'Shared',
        high: 'Shared',
      })
    ).toThrowError('Enum labels must be unique.');
  });

  it('looks up labels and checks whether labels exist', () => {
    const priority = createLabeledEnum('string', {
      low: 'Low',
      high: 'High',
    });

    expect(priority.labelOf('high')).toBe('High');
    expect(priority.labelOf('urgent')).toBeUndefined();
    expect(priority.hasLabel('Low')).toBe(true);
    expect(priority.hasLabel('Urgent')).toBe(false);
  });
});
