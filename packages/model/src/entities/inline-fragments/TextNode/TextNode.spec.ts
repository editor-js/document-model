import type { InlineToolName } from '../FormattingInlineNode';
import type { InlineFragment } from '../InlineNode';
import { TextNode } from './index.js';
import { ParentInlineNode } from '../ParentInlineNode/index.js';

jest.mock('../ParentInlineNode');

describe('TextNode', () => {
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

      expect(result).toEqual([ fragments[0] ]);
    });
  });
});
