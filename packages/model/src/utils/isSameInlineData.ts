import type { InlineToolData } from '@editorjs/model-types';

/**
 * Deep structural equality check for two plain JSON-like values.
 * @param a - first value to compare
 * @param b - second value to compare
 */
function deepEqual(a: unknown, b: unknown): boolean {
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

  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  return keysA.length === keysB.length
    && keysA.every(key => Object.prototype.hasOwnProperty.call(objB, key) && deepEqual(objA[key], objB[key]));
}

/**
 * Determines whether two inline tool data objects should be treated as equal.
 *
 * This is the model's default comparator, used to decide whether re-applying a tool is a
 * no-op and whether two same-tool fragments may be merged. Missing data is treated as empty,
 * so `undefined` and `{}` count as equal; otherwise a deep structural comparison is performed.
 * @todo Allow an inline tool to override this via the `InlineTool.isSameData` seam
 *       (declared in `@editorjs/sdk`). Wiring a per-tool comparator through the model is
 *       deferred until a built-in tool needs custom equality.
 * @param a - first inline tool data
 * @param b - second inline tool data
 */
export function isSameInlineData(a?: InlineToolData, b?: InlineToolData): boolean {
  return deepEqual(a ?? {}, b ?? {});
}
