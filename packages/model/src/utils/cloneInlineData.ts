import type { InlineToolData } from '@editorjs/model-types';

/**
 * Deep copy of a plain JSON-like value, following JSON for undefined:
 * object keys whose value is undefined are dropped, and undefined array items become null
 * @param value - value to copy
 */
function deepClone<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(item => (item === undefined ? null : deepClone(item as unknown))) as T;
  }

  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, deepClone(item as unknown)])
    ) as T;
  }

  return value;
}

/**
 * Returns a deep copy of inline tool data, so the copy can be stored or handed out without sharing nested objects.
 *
 * The copy follows JSON for undefined values, which is how the data is serialized anyway. This also keeps data
 * comparisons consistent: two values that serialize the same are equal under `isSameInlineData`
 * @param data - inline tool data to copy
 */
export function cloneInlineData(data: InlineToolData): InlineToolData {
  return deepClone(data);
}
