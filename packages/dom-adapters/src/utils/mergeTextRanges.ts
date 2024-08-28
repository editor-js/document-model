import type { TextRange } from '@editorjs/model';

/**
 * Return one merged from text range from two ranges
 * This method does not check for intersection between ranges
 *
 * @param firstRange - first range to be merged
 * @param secondRange - second range to be merged
 * @returns merged text range
 */
export function mergeTextRanges(firstRange: TextRange, secondRange: TextRange): TextRange {
  return [Math.min(firstRange[0], secondRange[0]), Math.max(firstRange[1], secondRange[1])];
}
