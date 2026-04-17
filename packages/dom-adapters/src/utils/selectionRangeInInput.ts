import type { TextRange } from '@editorjs/model';
import { getAbsoluteRangeOffset } from './getAbsoluteRangeOffset.js';

/**
 * True if the input contains the whole selection (not cross-input for this field).
 * @param input - input element
 * @param range - selection range (`Range` or `StaticRange`)
 */
export function isInputContainsWholeSelection(input: HTMLElement, range: AbstractRange): boolean {
  return input.contains(range.startContainer) && input.contains(range.endContainer);
}

/**
 * True if the input contains only the start of the cross-input selection.
 * @param input - input element
 * @param range - selection range
 */
export function isInputContainsOnlyStartOfSelection(input: HTMLElement, range: AbstractRange): boolean {
  return input.contains(range.startContainer) && !input.contains(range.endContainer);
}

/**
 * True if the input contains only the end of the cross-input selection.
 * @param input - input element
 * @param range - selection range
 */
export function isInputContainsOnlyEndOfSelection(input: HTMLElement, range: AbstractRange): boolean {
  return input.contains(range.endContainer) && !input.contains(range.startContainer);
}

/**
 * True if the input is in between the cross-input selection (neither anchor inside, range still spans it).
 * @param input - input element
 * @param range - selection range
 */
export function isInputInBetweenSelection(input: HTMLElement, range: AbstractRange): boolean {
  return !isInputContainsWholeSelection(input, range)
    && !isInputContainsOnlyStartOfSelection(input, range)
    && !isInputContainsOnlyEndOfSelection(input, range);
}

/**
 * Returns the text range inside `input` that overlaps the document `selectionRange`,
 * or null if the range does not intersect this input.
 *
 * Handles cross-input selection: only the start of the selection, only the end,
 * the full selection inside one input, or a block fully covered in between.
 * @param selectionRange - current document selection range
 * @param input - contenteditable (or similar) root for model text offsets
 */
export function getClippedTextRangeForInput(selectionRange: Range, input: HTMLElement): TextRange | null {
  if (!selectionRange.intersectsNode(input)) {
    return null;
  }

  let start: number;
  let end: number;

  if (isInputContainsWholeSelection(input, selectionRange)) {
    start = getAbsoluteRangeOffset(input, selectionRange.startContainer, selectionRange.startOffset);
    end = getAbsoluteRangeOffset(input, selectionRange.endContainer, selectionRange.endOffset);
  } else if (isInputContainsOnlyStartOfSelection(input, selectionRange)) {
    start = getAbsoluteRangeOffset(input, selectionRange.startContainer, selectionRange.startOffset);
    end = input.textContent?.length ?? 0;
  } else if (isInputContainsOnlyEndOfSelection(input, selectionRange)) {
    start = 0;
    end = getAbsoluteRangeOffset(input, selectionRange.endContainer, selectionRange.endOffset);
  } else if (isInputInBetweenSelection(input, selectionRange)) {
    /**
     * Selection spans this input in the middle (anchors lie in other blocks).
     * `getAbsoluteRangeOffset(input, input, …)` is not valid here: for a non-Text root it returns 0.
     */
    start = 0;
    end = input.textContent?.length ?? 0;
  } else {
    return null;
  }

  if (start > end) {
    [start, end] = [end, start];
  }

  return [start, end] as TextRange;
}
