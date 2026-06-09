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
 * Insert a value into an array at the index specified by the last key segment.
 * Does nothing if the path does not exist or the parent is not an array.
 * @param data - root object
 * @param keys - keypath where the last segment is the target index
 * @param value - value to splice in
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- unknown can't be used as data parameter is used for recursion
export function insert<T = unknown>(data: Record<string | number | symbol, any>, keys: string | string[], value: T): void {
  const parsedKeys = Array.isArray(keys) ? [...keys] : keys.split('.');

  if (parsedKeys.length === 0) {
    return;
  }

  const lastKey = parsedKeys.pop()!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- unknown can't be used as data parameter is used for recursion
  const parent = get<any[]>(data, parsedKeys);

  if (!Array.isArray(parent)) {
    return;
  }

  const index = Number(lastKey);

  if (!Number.isInteger(index) || index < 0) {
    return;
  }

  parent.splice(index, 0, value);
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
    const index = Number(lastKey);

    if (!Number.isInteger(index) || index < 0) {
      return;
    }

    parent.splice(index, 1);
  } else {
    delete parent[lastKey];
  }
}

/**
 * Renumbers array-indexed segments in a set of dot-notation keys so that
 * each prefix's first array index becomes 0.
 *
 * For example, given keys `['items.2.text', 'items.3.text']` the result is
 * `{ 'items.2.text': 'items.0.text', 'items.3.text': 'items.1.text' }`.
 *
 * Keys that contain no numeric segment are returned unchanged.
 * @param keys - flat dot-notation data keys to renumber
 * @returns a map of original key → renumbered key
 */
export function renumberKeys(keys: string[]): Map<string, string> {
  const minArrayIndices = new Map<string, number>();

  for (const key of keys) {
    const segments = key.split('.');
    const numericIdx = segments.findIndex(s => !isNaN(Number(s)) && s !== '');

    if (numericIdx !== -1) {
      const prefix = segments.slice(0, numericIdx).join('.');
      const index = Number(segments[numericIdx]);
      const current = minArrayIndices.get(prefix);

      if (current === undefined || index < current) {
        minArrayIndices.set(prefix, index);
      }
    }
  }

  const result = new Map<string, string>();

  for (const key of keys) {
    const segments = key.split('.');
    const numericIdx = segments.findIndex(s => !isNaN(Number(s)) && s !== '');

    if (numericIdx !== -1) {
      const prefix = segments.slice(0, numericIdx).join('.');
      const minIndex = minArrayIndices.get(prefix);

      if (minIndex !== undefined) {
        const renumbered = [...segments];

        renumbered[numericIdx] = String(Number(segments[numericIdx]) - minIndex);
        result.set(key, renumbered.join('.'));

        continue;
      }
    }

    result.set(key, key);
  }

  return result;
}
