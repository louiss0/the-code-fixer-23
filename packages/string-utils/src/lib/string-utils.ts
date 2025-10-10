/**
 * string-utils.ts
 * Small set of string utilities: capitalize, reverse, truncate, slugify
 */

/**
 * Capitalize the first letter of each word (ASCII letters).
 */
export function capitalize(input: string): string {
  if (!input) return input;
  return input.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/**
 * Reverse a string while handling Unicode code points reasonably well.
 */
export function reverse(input: string): string {
  return Array.from(input).reverse().join("");
}

/**
 * Truncate a string to a maximum length, appending an ellipsis if needed.
 * If maxLength is shorter than the ellipsis, the ellipsis is sliced.
 */
export function truncate(
  input: string,
  maxLength: number,
  ellipsis = "…"
): string {
  if (maxLength <= 0) return "";
  if (input.length <= maxLength) return input;

  const e = ellipsis ?? "";
  if (maxLength <= e.length) return e.slice(0, maxLength);

  return input.slice(0, maxLength - e.length) + e;
}

/**
 * Convert a string into a URL-friendly slug.
 * - Lowercase
 * - Remove diacritics
 * - Replace non-alphanumerics with '-'
 * - Collapse multiple '-' and trim edges
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
