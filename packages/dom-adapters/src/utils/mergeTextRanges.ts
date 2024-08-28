import type { TextRange } from '@editorjs/model';
import { doRangesIntersect } from './doRangesIntersect.js';

/**
 * Merge two text ranges
 *
 * @param firstRange - first range to be merged
 * @param secondRange - second range to be merged
 * @returns {TextRange | null} merged text range or null if ranges do not intersect
 */
export function mergeTextRanges(firstRange: TextRange, secondRange: TextRange): TextRange | null {
  if (doRangesIntersect(firstRange, secondRange)) {
    return [Math.min(firstRange[0], secondRange[0]), Math.max(firstRange[1], secondRange[1])];
  }

  return null;
}
