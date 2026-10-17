/* eslint-disable @typescript-eslint/no-magic-numbers */
import { describe, expect, it, jest } from '@jest/globals';
import type { InlineFragment, InlineToolName } from '@editorjs/sdk';
import { collectFragmentsToRender } from './collectFragmentsToRender.js';

const bold = 'bold' as InlineToolName;
const italic = 'italic' as InlineToolName;

/**
 * Creates a fragment
 * @param tool - inline tool name
 * @param start - range start
 * @param end - range end
 */
function fragment(tool: InlineToolName, start: number, end: number): InlineFragment {
  return {
    tool,
    range: [start, end],
  };
}

/**
 * Returns a query over the fragments with the model's semantics: whole fragments sharing a character with the range
 * @param fragments - all fragments of the input
 */
function queryOver(fragments: InlineFragment[]): jest.Mock<(start: number, end: number) => InlineFragment[]> {
  return jest.fn((start: number, end: number) => fragments.filter(f => start < end && f.range[0] < end && f.range[1] > start));
}

describe('collectFragmentsToRender()', () => {
  it('should return the range and its fragments when no fragment reaches outside', () => {
    const query = queryOver([fragment(bold, 3, 5)]);

    expect(collectFragmentsToRender(query, 2, 6)).toEqual({
      start: 2,
      end: 6,
      fragments: [fragment(bold, 3, 5)],
    });
  });

  it('should include fragments that only overlap the widened range', () => {
    /**
     * italic [0,2), bold [0,10), italic [8,9) on "abcdefghij": the edit around [7,10) reaches bold [0,10),
     * which brings italic [0,2) into the region to re-render
     */
    const query = queryOver([fragment(bold, 0, 10), fragment(italic, 0, 2), fragment(italic, 8, 9)]);

    expect(collectFragmentsToRender(query, 7, 10)).toEqual({
      start: 0,
      end: 10,
      fragments: [fragment(bold, 0, 10), fragment(italic, 0, 2), fragment(italic, 8, 9)],
    });
  });

  it('should include fragments around a partially unformatted range', () => {
    /**
     * bold [0,10) with italic [0,2) and italic [8,10); unformatting bold over [4,6) leaves bold [0,4) and [6,10)
     */
    const query = queryOver([fragment(bold, 0, 4), fragment(italic, 0, 2), fragment(bold, 6, 10), fragment(italic, 8, 10)]);

    expect(collectFragmentsToRender(query, 3, 7)).toEqual({
      start: 0,
      end: 10,
      fragments: [fragment(bold, 0, 4), fragment(italic, 0, 2), fragment(bold, 6, 10), fragment(italic, 8, 10)],
    });
  });

  it('should keep the range when the remaining fragment starts after it', () => {
    const query = queryOver([fragment(bold, 5, 8)]);

    expect(collectFragmentsToRender(query, 1, 6)).toEqual({
      start: 1,
      end: 8,
      fragments: [fragment(bold, 5, 8)],
    });
  });

  it('should widen step by step until no new fragment is reached', () => {
    const query = queryOver([fragment(bold, 4, 8), fragment(italic, 7, 12), fragment(bold, 11, 15)]);

    const result = collectFragmentsToRender(query, 5, 6);

    expect(result.start).toBe(4);
    expect(result.end).toBe(15);
    expect(result.fragments).toHaveLength(3);
    expect(query).toHaveBeenLastCalledWith(4, 15);
  });

  it('should return no fragments for a range without formatting', () => {
    expect(collectFragmentsToRender(queryOver([]), 2, 4)).toEqual({
      start: 2,
      end: 4,
      fragments: [],
    });
  });
});
