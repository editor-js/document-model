/**
 * Get value from object by keypath
 * @param data - object to get value from
 * @param keys - keypath to a value
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- unknown can't be used as data parameter is used for recursion
export function get<T = unknown>(data: Record<string | number | symbol, any>, keys: string | string[]): T | undefined {
  const parsedKeys = Array.isArray(keys) ? keys : keys.split('.');
  const key = parsedKeys.shift();

  if (key === undefined) {
    return data as T;
  }

  if (data[key] === undefined) {
    return undefined;
  }

  return get(data[key] as Record<string, unknown>, parsedKeys);
}

/**
 * Set value to object by keypath
 * @param data - object to set value to
 * @param keys - keypath to a value
 * @param value - value to set
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- unknown can't be used as data parameter is used for recursion
export function set<T = unknown>(data: Record<string | number | symbol, any>, keys: string | string[], value: T): void {
  const parsedKeys = Array.isArray(keys) ? keys : keys.split('.');
  const key = parsedKeys.shift();

  if (key === undefined) {
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
 * @param data - object to check
 * @param keys - keypath to a value
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- unknown can't be used as data parameter is used for recursion
export function has(data: Record<string | number | symbol, any>, keys: string | string[]): boolean {
  return get(data, keys) !== undefined;
}

/**
 * Remove value from object by keypath.
 * For array parents the element is spliced out (removes the slot entirely).
 * For object parents the property is deleted.
 * Does nothing if the path does not exist.
 * @param data - object to remove value from
 * @param keys - keypath to the value to remove
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- unknown can't be used as data parameter is used for recursion
export function remove(data: Record<string | number | symbol, any>, keys: string | string[]): void {
  const parsedKeys = Array.isArray(keys) ? [...keys] : keys.split('.');

  if (parsedKeys.length === 0) {
    return;
  }

  const lastKey = parsedKeys.pop()!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- unknown can't be used as data parameter is used for recursion
  const parent = get<Record<string | number, any>>(data, parsedKeys);

  if (parent === undefined || parent === null) {
    return;
  }

  if (Array.isArray(parent)) {
    parent.splice(Number(lastKey), 1);
  } else {
    delete parent[lastKey];
  }
}
