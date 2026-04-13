import { getRangesIntersectionType, RangeIntersectionType } from './getRangesIntersectionType.js';

/* eslint-disable @typescript-eslint/no-magic-numbers */
describe('getRangesIntersectionType', () => {
  it('returns None when ranges are separated with gap to the right', () => {
    expect(getRangesIntersectionType([0, 2], [5, 7])).toBe(RangeIntersectionType.None);
  });

  it('returns None when ranges are separated with gap to the left', () => {
    expect(getRangesIntersectionType([8, 10], [2, 4])).toBe(RangeIntersectionType.None);
  });

  it('returns Includes when range fully contains the compared range', () => {
    expect(getRangesIntersectionType([0, 12], [3, 7])).toBe(RangeIntersectionType.Includes);
  });

  it('returns Included when range lies strictly inside the compared range', () => {
    expect(getRangesIntersectionType([4, 6], [2, 9])).toBe(RangeIntersectionType.Included);
  });

  it('returns Right when the right end of range enters the compared range but does not reach its end', () => {
    expect(getRangesIntersectionType([3, 8], [5, 12])).toBe(RangeIntersectionType.Right);
  });

  it('returns Left when the left end enters the compared rannge but does not reach its start', () => {
    expect(getRangesIntersectionType([8, 14], [5, 10])).toBe(RangeIntersectionType.Left);
  });

  it('treats identical non-empty ranges as Includes', () => {
    expect(getRangesIntersectionType([3, 7], [3, 7])).toBe(RangeIntersectionType.Includes);
  });
});
