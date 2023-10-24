/**
 * Get value from object by keypath
 *
 * @param data - object to get value from
 * @param keys - keypath to a value
 */
export function get<T = unknown>(data: Record<string | number | symbol, unknown>, keys: string | string[]): T | undefined {
  const parsedKeys  = Array.isArray(keys) ? keys : keys.split('.');
  const key = parsedKeys.shift();

  if (!key) {
    return data as T;
  }

  if (data[key] === undefined) {
    return undefined;
  }

  return get(data[key] as Record<string, unknown>, parsedKeys);
}

/**
 * Set value to object by keypath
 *
 * @param data - object to set value to
 * @param keys - keypath to a value
 * @param value - value to set
 */
export function set<T = unknown>(data: Record<string, unknown>, keys: string | string[], value: T): void {
  const parsedKeys  = Array.isArray(keys) ? keys : keys.split('.');
  const key = parsedKeys.shift();

  if (!key) {
    return;
  }

  if (parsedKeys.length === 0) {
    data[key] = value;

    return;
  }

  if (data[key] === undefined) {
    data[key] = !isNaN(Number(parsedKeys[0])) ? [] : {};
  }

  set(data[key] as Record<string, unknown>, parsedKeys, value);
}

/**
 * Check if object has value by keypath
 *
 * @param data - object to check
 * @param keys - keypath to a value
 */
export function has(data: Record<string | number | symbol, unknown>, keys: string | string[]): boolean {
  return get(data, keys) !== undefined;
}
