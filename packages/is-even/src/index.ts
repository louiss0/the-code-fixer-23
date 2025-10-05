/**
 * Checks if a number is even.
 * 
 * @param num - The number to check
 * @returns true if the number is even, false otherwise
 * 
 * @example
 * ```ts
 * import { isEven } from '@code-fixer-23/is-even';
 * 
 * isEven(2); // true
 * isEven(3); // false
 * isEven(0); // true
 * isEven(-4); // true
 * ```
 */
export function isEven(num: number): boolean {
  return num % 2 === 0;
}
