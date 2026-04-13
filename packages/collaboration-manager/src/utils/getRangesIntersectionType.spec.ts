import { getRangesIntersectionType, RangeIntersectionType } from './getRangesIntersectionType.js';

/* eslint-disable @typescript-eslint/no-magic-numbers */
describe('getRangesIntersectionType', () => {
  describe('RangeIntersectionType.None', () => {
    it('returns None when ranges are separated with gap to the right', () => {
      expect(getRangesIntersectionType([0, 2], [5, 7])).toBe(RangeIntersectionType.None);
    });

    it('returns None when ranges are separated with gap to the left', () => {
      expect(getRangesIntersectionType([8, 10], [2, 4])).toBe(RangeIntersectionType.None);
    });

    it('returns None when both ranges are empty and non-overlapping', () => {
      expect(getRangesIntersectionType([0, 0], [2, 2])).toBe(RangeIntersectionType.None);
    });

    it('returns None when one range is empty to the right of the other', () => {
      expect(getRangesIntersectionType([10, 10], [2, 9])).toBe(RangeIntersectionType.None);
    });

    it('returns None when one range is empty to the left of the other', () => {
      expect(getRangesIntersectionType([0, 0], [2, 10])).toBe(RangeIntersectionType.None);
    });
  });

  describe('RangeIntersectionType.Includes', () => {
    it('returns Includes when range fully contains the compared range', () => {
      expect(getRangesIntersectionType([0, 12], [3, 7])).toBe(RangeIntersectionType.Includes);
    });

    it('returns Includes when range fully contains the compared range and right boundaries match', () => {
      expect(getRangesIntersectionType([3, 10], [5, 10])).toBe(RangeIntersectionType.Includes);
    });

    it('returns Includes when range fully contains the compared range and left boundaries match', () => {
      expect(getRangesIntersectionType([4, 12], [4, 9])).toBe(RangeIntersectionType.Includes);
    });

    it('returns Includes for identical non-empty ranges', () => {
      expect(getRangesIntersectionType([3, 7], [3, 7])).toBe(RangeIntersectionType.Includes);
    });
  });

  describe('RangeIntersectionType.Included', () => {
    it('returns Included when range lies strictly inside the compared range', () => {
      expect(getRangesIntersectionType([4, 6], [2, 9])).toBe(RangeIntersectionType.Included);
    });

    it('returns Included when range boundaries match right boundary of compared range', () => {
      expect(getRangesIntersectionType([5, 10], [3, 10])).toBe(RangeIntersectionType.Included);
    });

    it('returns Included when range boundaries match left boundary of compared range', () => {
      expect(getRangesIntersectionType([4, 9], [4, 12])).toBe(RangeIntersectionType.Included);
    });

    it('returs Included for identical empty ranges', () => {
      expect(getRangesIntersectionType([1, 1], [1, 1])).toBe(RangeIntersectionType.Included);
    });
  });

  describe('RangeIntersectionType.Right', () => {
    it('returns Right when the right end of range enters the compared range but does not reach its end', () => {
      expect(getRangesIntersectionType([3, 8], [5, 12])).toBe(RangeIntersectionType.Right);
    });

    it('returns Right when the right end of range enters the compared range but does not reach its end', () => {
      expect(getRangesIntersectionType([3, 8], [5, 12])).toBe(RangeIntersectionType.Right);
    });
  });

  describe('RangeIntersectionType.Left', () => {
    it('returns Left when the left end enters the compared range but does not reach its start', () => {
      expect(getRangesIntersectionType([8, 14], [5, 10])).toBe(RangeIntersectionType.Left);
    });
  });
});
