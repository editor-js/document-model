import { describe, it, expect, beforeEach } from '@jest/globals';
import { TextNode } from './index';
import type { BlockNode } from '../BlockNode';
import { createFormattingNodeName, FormattingNode } from '../FormattingNode';

describe('TextNode', () => {
  const initialText = 'initial text';
  const text = 'some text';
  let node: TextNode;

  beforeEach(() => {
    node = new TextNode({
      value: initialText,
      parent: {} as BlockNode,
    });
  });

  it('should have empty value by default', () => {
    node = new TextNode({
      parent: {} as BlockNode,
    });

    expect(node.getText()).toEqual('');
  });

  describe('insertText', () => {
    it('should set text to value if empty', () => {
      node = new TextNode({
        parent: {} as BlockNode,
      });

      node.insertText(text);

      expect(node.getText()).toEqual(text);
    });

    it('should append text if not empty', () => {
      node.insertText(text);

      expect(node.getText()).toEqual(initialText + text);
    });

    it('should prepend text if index is 0 and node is not empty', () => {
      node.insertText(text, 0);

      expect(node.getText()).toEqual(text + initialText);
    });

    it('should insert text at index if not empty', () => {
      const index = 5;

      node.insertText(text, index);

      expect(node.getText()).toEqual(initialText.slice(0, index) + text + initialText.slice(index));
    });

    it('should throw an error if index is less than 0', () => {
      const f = (): void => node.insertText(text, -1);

      expect(f).toThrowError();
    });

    it('should throw an error if index is greater than node length', () => {
      const f = (): void => node.insertText(text, initialText.length + 1);

      expect(f).toThrowError();
    });
  });

  describe('getText', () => {
    it('should return sliced value if start provided', () => {
      const start = 5;

      expect(node.getText(start)).toEqual(initialText.slice(start));
    });

    it('should return sliced value if end provided', () => {
      const end = 6;

      expect(node.getText(0, end)).toEqual(initialText.slice(0, end));
    });

    it('should return sliced value if full range provided', () => {
      const start = 3;
      const end = 9;

      expect(node.getText(start, end)).toEqual(initialText.slice(start, end));
    });

    it('should throw an error if start is invalid index', () => {
      expect(() => node.getText(-1)).toThrowError();
      expect(() => node.getText(initialText.length + 1)).toThrowError();
    });

    it('should throw an error if end is invalid index', () => {
      expect(() => node.getText(0, initialText.length + 1)).toThrowError();
    });

    it('should throw an error if end index is greater than start index', () => {
      const start = 5;
      const end = 3;

      expect(() => node.getText(start, end)).toThrowError();
    });

    it('should not throw an error if end index is equal to start index', () => {
      const start = 5;
      const end = 5;

      expect(() => node.getText(start, end)).not.toThrowError();
    });
  });

  describe('format', () => {
    it('should return just one FormattingNode, if formatting full TextNode', () => {
      const name = createFormattingNodeName('bold');

      const fragments = node.format(name, 0, initialText.length);

      expect(fragments).toHaveLength(1);
      expect(fragments[0]).toBeInstanceOf(FormattingNode);
    });

    it('should return return two fragments if formatting from the start, but not to the end', () => {
      const name = createFormattingNodeName('bold');
      const end = 5;

      const fragments = node.format(name, 0, end);

      expect(fragments).toHaveLength(2);
      expect(fragments[0]).toBeInstanceOf(FormattingNode);
      expect(fragments[1]).toBeInstanceOf(TextNode);
    });

    it('should return return two fragments if formatting to the end, but not from the start', () => {
      const name = createFormattingNodeName('bold');
      const start = 5;

      const fragments = node.format(name, start, initialText.length);

      expect(fragments).toHaveLength(2);
      expect(fragments[0]).toBeInstanceOf(TextNode);
      expect(fragments[1]).toBeInstanceOf(FormattingNode);
    });

    it('should return return three fragments if formatting in the middle', () => {
      const name = createFormattingNodeName('bold');
      const start = 5;
      const end = 8;

      const fragments = node.format(name, start, end);

      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      expect(fragments).toHaveLength(3);
      expect(fragments[0]).toBeInstanceOf(TextNode);
      expect(fragments[1]).toBeInstanceOf(FormattingNode);
      expect(fragments[2]).toBeInstanceOf(TextNode);
    });
  });
});
