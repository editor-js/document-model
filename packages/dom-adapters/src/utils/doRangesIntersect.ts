import type { TextRange } from '@editorjs/model';

/**
 * Check if two ranges have intersection
 *
 * @param firstRange - first text range
 * @param secondRange - second text range
 * @returns {boolean} true if itersect exists, false otherwise
 */
export function doRangesIntersect(firstRange: TextRange, secondRange: TextRange): boolean {
  return (firstRange[0] - secondRange[1]) * (secondRange[0] - firstRange[1]) > 0 ;
}
