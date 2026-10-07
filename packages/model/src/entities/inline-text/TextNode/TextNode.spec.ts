/* eslint-disable @typescript-eslint/no-magic-numbers */
import { BlockChildType, createInlineToolData, createInlineToolName, NODE_TYPE_HIDDEN_PROP } from '@editorjs/model-types';
import { TextNode } from './index.js';

describe('TextNode', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should not insert text if initial value is not passed', () => {
      const spy = jest.spyOn(TextNode.prototype, 'insertText');

      new TextNode();

      expect(spy).not.toHaveBeenCalled();
    });

    it('should insert initial value', () => {
      const value = 'Editor.js is a block-styled editor';
      const spy = jest.spyOn(TextNode.prototype, 'insertText');

      const node = new TextNode({ value });

      expect(spy).toHaveBeenCalledWith(value);
      expect(node.getText()).toBe(value);
    });

    it('should not apply fragments if initial value is not passed', () => {
      const spy = jest.spyOn(TextNode.prototype, 'format');

      new TextNode({
        fragments: [
          {
            tool: createInlineToolName('bold'),
            range: [0, 5],
          },
        ],
      });

      expect(spy).not.toHaveBeenCalled();
    });

    it('should apply each initial fragment', () => {
      const bold = createInlineToolName('bold');
      const link = createInlineToolName('link');
      const data = createInlineToolData({ href: 'https://editorjs.io' });
      const spy = jest.spyOn(TextNode.prototype, 'format');

      new TextNode({
        value: 'Editor.js is a block-styled editor',
        fragments: [
          {
            tool: bold,
            range: [0, 5],
          },
          {
            tool: link,
            range: [10, 14],
            data,
          },
        ],
      });

      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledWith(bold, 0, 5, undefined);
      expect(spy).toHaveBeenCalledWith(link, 10, 14, data);
    });
  });

  describe('.length', () => {
    it('should return 0 for empty text', () => {
      expect(new TextNode().length).toBe(0);
    });

    it('should return the text length across formatting', () => {
      const node = new TextNode({ value: 'abcdef' });

      node.format(createInlineToolName('bold'), 1, 3);

      expect(node.length).toBe(6);
    });
  });

  describe('.serialized', () => {
    it('should mark the output with BlockChildType.Text', () => {
      const node = new TextNode({ value: 'hello' });

      expect(node.serialized).toStrictEqual({
        [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text,
        value: 'hello',
        fragments: [],
      });
    });
  });
});
