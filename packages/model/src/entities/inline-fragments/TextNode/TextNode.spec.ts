import type { InlineToolName } from '../FormattingInlineNode/index.js';
import type { InlineFragment } from '../InlineNode/index.js';
import { TextNode } from './index.js';
import { ParentInlineNode } from '../ParentInlineNode/index.js';
import { BlockChildType } from '../../BlockNode/types/index.js';
import { NODE_TYPE_HIDDEN_PROP } from '../../BlockNode/consts.js';

jest.mock('../ParentInlineNode');

describe('TextNode', () => {
  describe('.serialized', () => {
    it('should add NODE_TYPE_HIDDEN_PROP with BlockChildType.Text to the parent serialized output', () => {
      const superSerialized = {
        value: 'hello',
        fragments: [],
      };

      jest.spyOn(ParentInlineNode.prototype, 'serialized', 'get').mockReturnValueOnce(superSerialized);

      const node = new TextNode();
      const result = node.serialized;

      expect(result[NODE_TYPE_HIDDEN_PROP]).toBe(BlockChildType.Text);
      expect(result.value).toBe('hello');
      expect(result.fragments).toEqual([]);
    });
  });

  describe('.getFragments()', () => {
    it('should return all fragments for the specific range', () => {
      const boldFragmentStart = 0;
      const boldFragmentEnd = 5;
      const italicFragmentStart = 3;
      const italicFragmentEnd = 10;

      const testRangeStart = 2;
      const testRangeEnd = 7;

      const fragments: InlineFragment[] = [
        {
          tool: 'bold' as InlineToolName,
          range: [boldFragmentStart, boldFragmentEnd],
        },
        {
          tool: 'italic' as InlineToolName,
          range: [italicFragmentStart, italicFragmentEnd],
        },
      ];

      jest.spyOn(ParentInlineNode.prototype, 'getFragments').mockReturnValueOnce(fragments);

      const node = new TextNode({
        value: 'Editor.js is a block-styled editor',
        fragments,
      });

      const result = node.getFragments(testRangeStart, testRangeEnd);

      expect(result).toEqual(fragments);
    });

    it('should return filtered fragments by inline tool name', () => {
      const boldFragmentStart = 0;
      const boldFragmentEnd = 5;
      const italicFragmentStart = 3;
      const italicFragmentEnd = 10;

      const testRangeStart = 2;
      const testRangeEnd = 7;

      const fragments: InlineFragment[] = [
        {
          tool: 'bold' as InlineToolName,
          range: [boldFragmentStart, boldFragmentEnd],
        },
        {
          tool: 'italic' as InlineToolName,
          range: [italicFragmentStart, italicFragmentEnd],
        },
      ];

      jest.spyOn(ParentInlineNode.prototype, 'getFragments').mockReturnValueOnce(fragments);

      const node = new TextNode({
        value: 'Editor.js is a block-styled editor',
        fragments,
      });

      const result = node.getFragments(testRangeStart, testRangeEnd, 'bold' as InlineToolName);

      expect(result).toEqual([fragments[0]]);
    });
  });
});
