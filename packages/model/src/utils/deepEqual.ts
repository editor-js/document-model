/**
 * Whether a value is a record whose own keys describe it: a `Date` or a `Map` has none, so two of them would compare
 * equal. Read from the built-in tag, not the prototype, which `structuredClone` output may not share with this realm
 * @param value - the object to classify
 */
function isKeyedObject(value: object): boolean {
  return Object.prototype.toString.call(value) === '[object Object]';
}

/**
 * Deep structural equality for two plain JSON-like values: keyed records by their own keys, arrays element by element,
 * everything else by `===`. Identity is not the question where the value may be a copy of what is already stored
 * @param a - first value to compare
 * @param b - second value to compare
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }

  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return false;
  }

  const aIsArray = Array.isArray(a);

  if (aIsArray !== Array.isArray(b)) {
    return false;
  }

  if (aIsArray) {
    const arrA = a as unknown[];
    const arrB = b as unknown[];

    return arrA.length === arrB.length && arrA.every((item, index) => deepEqual(item, arrB[index]));
  }

  /**
   * Not identical, and not something whose own keys describe it: comparing two `Date`s by key would call them equal
   * and swallow a write that changed one. Such a value is outside the JSON-serializable contract anyway
   */
  if (!isKeyedObject(a) || !isKeyedObject(b)) {
    return false;
  }

  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  return keysA.length === keysB.length
    && keysA.every(key => Object.prototype.hasOwnProperty.call(objB, key) && deepEqual(objA[key], objB[key]));
}
