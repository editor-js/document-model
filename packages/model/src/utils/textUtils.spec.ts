/* eslint-disable @typescript-eslint/no-magic-numbers, @typescript-eslint/no-explicit-any */
import { sliceFragments, mergeTextNodes } from './textUtils.js';
import type { InlineFragment, InlineTreeNodeSerialized, TextNodeSerialized } from '../entities/inline-fragments/InlineNode/index.js';
import type { InlineToolName } from '../entities/inline-fragments/index.js';
import { BlockChildType, NODE_TYPE_HIDDEN_PROP } from '../entities/BlockNode/index.js';

/**
 * Helper to create a TextNodeSerialized with the required hidden-type prop.
 * @param value - the text content of the node
 * @param fragments - optional inline fragments for the node
 */
function textNode(value: string, fragments: TextNodeSerialized['fragments'] = []): TextNodeSerialized {
  return {
    [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
    value,
    fragments,
  };
}

describe('textUtils', () => {
  describe('sliceFragments()', () => {
    it('should return an empty array when given no fragments', () => {
      expect(sliceFragments([], 0)).toEqual([]);
    });

    it('should drop fragments that end at or before the offset', () => {
      const fragments: InlineFragment[] = [
        {
          tool: 'bold' as InlineToolName,
          range: [0, 3],
        },
        {
          tool: 'italic' as InlineToolName,
          range: [4, 8],
        },
      ];

      const result = sliceFragments(fragments, 5);

      expect(result).toHaveLength(1);
      expect(result[0].range).toEqual([0, 3]);
    });

    it('should shift fragment ranges by the offset', () => {
      const fragments: InlineFragment[] = [
        { tool: 'bold' as InlineToolName,
          range: [3, 7] },
      ];

      const result = sliceFragments(fragments, 3);

      expect(result).toHaveLength(1);
      expect(result[0].range).toEqual([0, 4]);
    });

    it('should clamp the start of a partially-overlapping fragment to 0', () => {
      const fragments: InlineFragment[] = [
        {
          tool: 'bold' as InlineToolName,
          range: [1, 5],
        },
      ];

      const result = sliceFragments(fragments, 3);

      expect(result).toHaveLength(1);
      expect(result[0].range[0]).toBe(0);
      expect(result[0].range[1]).toBe(2);
    });

    it('should keep all fragments when offset is 0', () => {
      const fragments: InlineFragment[] = [
        {
          tool: 'bold' as InlineToolName,
          range: [0, 4],
        },
        {
          tool: 'italic' as InlineToolName,
          range: [5, 10],
        },
      ];

      const result = sliceFragments(fragments, 0);

      expect(result).toHaveLength(2);
    });
  });

  describe('mergeTextNodes()', () => {
    it('should return the initial accumulator unchanged when entries is empty', () => {
      const initial: InlineTreeNodeSerialized = {
        value: 'hello',
        fragments: [],
      };

      const result = mergeTextNodes([], initial);

      expect(result).toEqual(initial);
    });

    it('should concatenate values separated by newlines', () => {
      const initial: InlineTreeNodeSerialized = {
        value: 'first\n',
        fragments: [],
      };
      const entries: [string, TextNodeSerialized][] = [
        ['b', textNode('second')],
      ];

      const result = mergeTextNodes(entries, initial);

      expect(result.value).toBe('first\nsecond\n');
    });

    it('should adjust fragment ranges to be relative to the merged value', () => {
      /**
       * 'abc\n' is 4 chars long so 'def' starts at offset 4
       */
      const initialLength = 4;
      const initial: InlineTreeNodeSerialized = {
        value: 'abc\n',
        fragments: [],
      };
      const entries: [string, TextNodeSerialized][] = [
        [
          'b',
          textNode('def', [{
            tool: 'bold' as InlineToolName,
            range: [0, 3],
          }]),
        ],
      ];

      const result = mergeTextNodes(entries, initial);

      expect(result.fragments).toHaveLength(1);
      expect(result.fragments[0].range).toEqual([initialLength, initialLength + 3]);
    });

    it('should handle multiple entries in order', () => {
      const initial: InlineTreeNodeSerialized = {
        value: 'a\n',
        fragments: [],
      };
      const entries: [string, TextNodeSerialized][] = [
        ['x', textNode('b')],
        ['y', textNode('c')],
      ];

      const result = mergeTextNodes(entries, initial);

      expect(result.value).toBe('a\nb\nc\n');
    });
  });
});
