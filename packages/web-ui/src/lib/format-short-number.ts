/**
 * Formats a number into a short value (e.g., 240k, 22m).
 * @param value The number to format.
 * @returns The formatted string.
 */
export function formatShortNumber(value: number): string {
  if (value >= 1_000_000_000) {
    return `${Math.round(value / 1_000_000_000)}b`;
  }
  if (value >= 1_000_000) {
    return `${Math.round(value / 1_000_000)}m`;
  }
  if (value >= 1_000) {
    // Round to nearest 10 for thousands
    return `${Math.round(value / 100) / 10}k`.replace(/\.0k$/, 'k');
  }
  return value.toString();
}
