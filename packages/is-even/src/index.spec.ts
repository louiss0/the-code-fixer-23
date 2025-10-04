import { describe, it, expect } from 'vitest';
import { isEven } from './index';

describe('isEven', () => {
  it('returns true for even positive numbers', () => {
    expect(isEven(2)).toBe(true);
    expect(isEven(4)).toBe(true);
    expect(isEven(100)).toBe(true);
  });

  it('returns false for odd positive numbers', () => {
    expect(isEven(1)).toBe(false);
    expect(isEven(3)).toBe(false);
    expect(isEven(99)).toBe(false);
  });

  it('returns true for zero', () => {
    expect(isEven(0)).toBe(true);
  });

  it('works with negative numbers', () => {
    expect(isEven(-2)).toBe(true);
    expect(isEven(-4)).toBe(true);
    expect(isEven(-1)).toBe(false);
    expect(isEven(-3)).toBe(false);
  });
});
