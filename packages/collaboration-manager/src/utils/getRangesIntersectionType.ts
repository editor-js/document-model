import { TextRange } from "@editorjs/model";

/**
 * Represents the type of intersection between two text ranges.
 */
export enum RangeIntersectionType {
  Left = 'left',
  Right = 'right',
  Includes = 'includes',
  Included = 'included',
  None = 'none',
}

export function getRangesIntersectionType(range: TextRange, rangeToCompare: TextRange): RangeIntersectionType {
  const [start, end] = range;
  const [startToCompare, endToCompare] = rangeToCompare;

  /**
   * Range is fully on the left or right of the range to compare
   */
  if (end <= startToCompare || start >= endToCompare) {
    return RangeIntersectionType.None;
  }

  /**
   * Range includes the range to compare
   * If two ranges are the same, intersection type is "includes"
   */
  if (start <= startToCompare && end >= endToCompare) {
    return RangeIntersectionType.Includes;
  } 

  /**
   * Range is included in the range to compare
   */
  if (start > startToCompare && end < endToCompare) {
    return RangeIntersectionType.Included;
  }

  /**
   * Right side of the range intersects with left side of the range to compare
   * Cases with includes and included are handled before
   */
  if (end > startToCompare && end < endToCompare) {
    return RangeIntersectionType.Right;
  }

  return RangeIntersectionType.Left;
}