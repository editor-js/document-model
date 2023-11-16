/**
 * Returns whether the value is an object
 *
 * @param value - The value to check
 */
export function isObject(value: unknown): value is object {
  return Array.isArray(value) === false && typeof value === 'object' && value !== null;
}
