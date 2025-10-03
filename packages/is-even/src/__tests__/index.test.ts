import { describe, it, expect } from 'vitest';
import { isEven } from '../index';

describe('isEven', () => {
  describe('positive numbers', () => {
    it('should return true for 0', () => {
      expect(isEven(0)).toBe(true);
    });

    it('should return true for positive even numbers', () => {
      expect(isEven(2)).toBe(true);
      expect(isEven(4)).toBe(true);
      expect(isEven(100)).toBe(true);
      expect(isEven(1000)).toBe(true);
    });

    it('should return false for positive odd numbers', () => {
      expect(isEven(1)).toBe(false);
      expect(isEven(3)).toBe(false);
      expect(isEven(99)).toBe(false);
      expect(isEven(1001)).toBe(false);
    });
  });

  describe('negative numbers', () => {
    it('should return true for negative even numbers', () => {
      expect(isEven(-2)).toBe(true);
      expect(isEven(-4)).toBe(true);
      expect(isEven(-100)).toBe(true);
    });

    it('should return false for negative odd numbers', () => {
      expect(isEven(-1)).toBe(false);
      expect(isEven(-3)).toBe(false);
      expect(isEven(-99)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle large numbers', () => {
      expect(isEven(Number.MAX_SAFE_INTEGER - 1)).toBe(true);
      expect(isEven(Number.MAX_SAFE_INTEGER)).toBe(false);
    });
  });
});
