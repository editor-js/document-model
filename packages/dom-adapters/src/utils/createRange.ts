import { getNodeTextLength } from './getNodeTextLength.js';
import { findChildByCharIndex } from './findChildByCharIndex.js';

/**
 * Returns DOM Range by char range (relative to input)
 *
 * @param input - input element char indexes are related to
 * @param start - start char index
 * @param end - end char index
 */
export function createRange(input: HTMLElement, start: number, end: number): Range {
  const length = getNodeTextLength(input);

  if (start < 0 || start > length || end < 0 || end > length) {
    throw new Error('InlineToolAdapter: range is out of bounds');
  }

  let startContainer: Node = input;
  let startOffset = start;
  let endContainer: Node = input;
  let endOffset = end;

  /**
   * Find start node and offset for the range
   */
  while (!(startContainer instanceof Text)) {
    const [child, offset] = findChildByCharIndex(startContainer, startOffset);

    startContainer = child;
    startOffset = startOffset - offset;
  }

  /**
   * Find end node and offset for the range
   */
  while (!(endContainer instanceof Text)) {
    const [child, offset] = findChildByCharIndex(endContainer, endOffset);

    endContainer = child;
    endOffset = endOffset - offset;
  }

  const range = new Range();

  /**
   * If startOffset equals to the length of the startContainer, we need to set start after the startContainer
   *
   * However, we also need to consider parent nodes siblings
   */
  if (startOffset === getNodeTextLength(startContainer)) {
    let nextSibling = startContainer.nextSibling;
    let parent = startContainer.parentNode!;

    while (nextSibling === null && parent !== input && parent !== null) {
      nextSibling = parent.nextSibling;
      parent = parent.parentNode!;
    }

    if (nextSibling !== null) {
      range.setStartBefore(nextSibling);
    } else {
      range.setStartAfter(startContainer);
    }
  } else {
    range.setStart(startContainer, startOffset);
  }

  /**
   * If endOffset equals to 0, we need to set end before the endContainer
   */
  if (endOffset === 0) {
    range.setEndBefore(endContainer);
    /**
     * If endOffset equals to the length of the endContainer, we need to set end after the endContainer
     *
     * We need to consider parent nodes siblings as well
     */
  } else if (endOffset === getNodeTextLength(endContainer)) {
    let nextSibling = endContainer.nextSibling;
    let parent = endContainer.parentNode!;

    while (nextSibling === null && parent !== input) {
      nextSibling = parent.nextSibling;
      parent = parent.parentNode!;
    }

    if (nextSibling !== null) {
      range.setEndBefore(nextSibling);
    } else {
      range.setEndAfter(endContainer);
    }
  } else {
    range.setEnd(endContainer, endOffset);
  }

  return range;
}
