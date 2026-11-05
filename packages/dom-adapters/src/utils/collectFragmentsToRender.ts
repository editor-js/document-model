import type { InlineFragment } from '@editorjs/sdk';

/**
 * Range of an input to re-render with all the fragments overlapping it
 */
export interface FragmentsToRender {
  /**
   * Range start
   */
  start: number;

  /**
   * Range end
   */
  end: number;

  /**
   * All fragments sharing a character with the range
   */
  fragments: InlineFragment[];
}

/**
 * Collects the range to re-render around an edit, with every fragment overlapping it.
 *
 * Fragments are returned whole, so they can reach outside the queried range and overlap other fragments there.
 * The range is widened to the fragments' boundaries and queried again until no new fragment is reached,
 * so rendering the range from plain text with the returned fragments doesn't drop any formatting inside it
 * @param getFragments - returns whole fragments sharing a character with the range
 * @param start - start of the range around the edit
 * @param end - end of the range around the edit
 */
export function collectFragmentsToRender(
  getFragments: (start: number, end: number) => InlineFragment[],
  start: number,
  end: number
): FragmentsToRender {
  let rangeStart = start;
  let rangeEnd = end;
  let fragments = getFragments(rangeStart, rangeEnd);

  for (;;) {
    const widenedStart = Math.min(rangeStart, ...fragments.map(fragment => fragment.range[0]));
    const widenedEnd = Math.max(rangeEnd, ...fragments.map(fragment => fragment.range[1]));

    if (widenedStart === rangeStart && widenedEnd === rangeEnd) {
      return {
        start: rangeStart,
        end: rangeEnd,
        fragments,
      };
    }

    rangeStart = widenedStart;
    rangeEnd = widenedEnd;
    fragments = getFragments(rangeStart, rangeEnd);
  }
}
