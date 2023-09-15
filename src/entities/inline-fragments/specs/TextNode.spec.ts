/* eslint-disable @typescript-eslint/no-magic-numbers */
import { TextNode } from '../TextNode';
import type { InlineToolData, InlineToolName } from '../FormattingInlineNode';

jest.mock('../mixins/ChildNode');
jest.mock('../mixins/ParentNode');
jest.mock('../ParentInlineNode');

describe('TextNode', () => {
  describe('initialization', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should not call insertText() method if initial value is not passed', () => {
      const spy = jest.spyOn(TextNode.prototype, 'insertText');

      new TextNode();

      expect(spy).not.toHaveBeenCalled();
    });

    it('should call insertText() method if initial value is passed', () => {
      const value = 'Editor.js is a block-styled editor';
      const spy = jest.spyOn(TextNode.prototype, 'insertText');

      new TextNode({ value });

      expect(spy).toHaveBeenCalledWith(value);
    });

    it('should not call format() method if initial fragments are not passed', () => {
      const spy = jest.spyOn(TextNode.prototype, 'format');

      new TextNode();

      expect(spy).not.toHaveBeenCalled();
    });

    it('should call format() method if initial fragments are passed', () => {
      const value = 'Editor.js is a block-styled editor';
      const fragments = [
        {
          tool: 'bold' as InlineToolName,
          range: [0, 5] as [number, number],
          data: {} as InlineToolData,
        },
      ];
      const spy = jest.spyOn(TextNode.prototype, 'format');

      new TextNode({
        value,
        fragments,
      });

      expect(spy).toHaveBeenCalledWith(fragments[0].tool, ...fragments[0].range, fragments[0].data);
    });

    it('should call format() method for each passed fragment', () => {
      const value = 'Editor.js is a block-styled editor';
      const fragments = [
        {
          tool: 'bold' as InlineToolName,
          range: [0, 5] as [number, number],
          data: {} as InlineToolData,
        },
        {
          tool: 'italic' as InlineToolName,
          range: [10, 14] as [number, number],
          data: {} as InlineToolData,
        },
      ];
      const spy = jest.spyOn(TextNode.prototype, 'format');

      new TextNode({
        value,
        fragments,
      });

      expect(spy).toHaveBeenCalledTimes(fragments.length);
    });
  });
});
