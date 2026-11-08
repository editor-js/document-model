import type { InlineToolData } from '@editorjs/model-types';
import { deepEqual } from './deepEqual.js';

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
