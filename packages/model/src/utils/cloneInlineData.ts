import type { InlineToolData } from '@editorjs/model-types';

/**
 * Deep copy of a plain JSON-like value
 * @param value - value to copy
 */
function deepClone<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(item => deepClone(item) as unknown) as T;
  }

  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, deepClone(item as unknown)])) as T;
  }

  return value;
}

/**
 * Returns a deep copy of inline tool data, so the copy can be stored or handed out without sharing nested objects
 * @param data - inline tool data to copy
 */
export function cloneInlineData(data: InlineToolData): InlineToolData {
  return deepClone(data);
}
