/**
 * Helper to map through object properties
 *
 * @param obj - object to map through
 * @param fn - map function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- any used in generic
export function mapObject<T extends Record<string | number | symbol, any>, M extends Record<keyof T, any>>(obj: T, fn: (entry: T[keyof T], key: string) => M[keyof T]): M {
  return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, fn(value, key)])) as M;
}
