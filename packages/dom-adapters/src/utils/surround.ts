import type { TextRange } from '@editorjs/model';
import { getBoundaryPointByAbsoluteOffset } from './getRelativeIndex.js';

/**
 * Function, that surrounds passed range with passed html element
 *
 * @param wrapper - element to surround the range
 * @param inputElement - element, where the range is located
 * @param textRange - range to be surrounded
 */
export function surround(wrapper: HTMLElement, inputElement: Node, textRange: TextRange): void {
  const range = document.createRange();

  range.setStart(...getBoundaryPointByAbsoluteOffset(inputElement, textRange[0]));
  range.setEnd(...getBoundaryPointByAbsoluteOffset(inputElement, textRange[1]));

  const extracted = range.extractContents();

  /**
   * Insert contents from range to new inline element and put created element in range
   */
  wrapper.appendChild(extracted);

  range.insertNode(wrapper);
}
