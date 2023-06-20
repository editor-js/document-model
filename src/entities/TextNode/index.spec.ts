import { describe, it, expect, beforeEach } from '@jest/globals';
import { TextNode } from './index';
import { createInlineToolName, FormattingNode } from '../FormattingNode';
import type { ParentNode } from '../interfaces';

describe('TextNode', () => {
  const initialText = 'initial text';
  const text = 'some text';
  const parentMock = {
    insertAfter: jest.fn(),
    removeChild: jest.fn(),
    append: jest.fn(),
    children: [],
  } as ParentNode;
  let node: TextNode;

  beforeEach(() => {
    node = new TextNode({
      value: initialText,
      parent: parentMock as FormattingNode,
    });
  });

  it('should have empty value by default', () => {
    node = new TextNode();

    expect(node.getText()).toEqual('');
  });

  describe('.insertText()', () => {
    it('should set text to value if node is empty', () => {
      node = new TextNode();

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

  describe('.getText()', () => {
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

  describe('.removeText()', () => {
    it('should remove all text by default', () => {
      node.removeText();

      expect(node.getText()).toEqual('');
    });

    it('should remove text from specified index', () => {
      const start = 3;

      node.removeText(start);

      expect(node.getText()).toEqual(initialText.slice(0, start));
    });

    it('should remove text from 0 to specified end index', () => {
      const end = 8;

      node.removeText(0, end);

      expect(node.getText()).toEqual(initialText.slice(end));
    });

    it('should remove text from specified start and end indecies', () => {
      const start = 3;
      const end = 8;

      node.removeText(start, end);

      expect(node.getText()).toEqual(initialText.slice(0, start) + initialText.slice(end));
    });

    it('should call remove() method if node is empty after removeText() call', () => {
      jest.spyOn(node, 'remove');

      node.removeText();

      expect(node.remove).toBeCalled();
    });
  });

  describe('.format()', () => {
    it('should return just one FormattingNode, if formatting full TextNode', () => {
      const name = createInlineToolName('bold');

      const fragments = node.format(name, 0, initialText.length);

      expect(fragments).toHaveLength(1);
      expect(fragments[0]).toBeInstanceOf(FormattingNode);
    });

    it('should return two fragments if formatting from the start, but not to the end', () => {
      const name = createInlineToolName('bold');
      const end = 5;

      const fragments = node.format(name, 0, end);

      expect(fragments).toHaveLength(2);
      expect(fragments[0]).toBeInstanceOf(FormattingNode);
      expect(fragments[1]).toBeInstanceOf(TextNode);
    });

    it('should return two fragments if formatting to the end, but not from the start', () => {
      const name = createInlineToolName('bold');
      const start = 5;

      const fragments = node.format(name, start, initialText.length);

      expect(fragments).toHaveLength(2);
      expect(fragments[0]).toBeInstanceOf(TextNode);
      expect(fragments[1]).toBeInstanceOf(FormattingNode);
    });

    it('should return three fragments if formatting in the middle', () => {
      const name = createInlineToolName('bold');
      const start = 5;
      const end = 8;

      const fragments = node.format(name, start, end);

      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      expect(fragments).toHaveLength(3);
      expect(fragments[0]).toBeInstanceOf(TextNode);
      expect(fragments[1]).toBeInstanceOf(FormattingNode);
      expect(fragments[2]).toBeInstanceOf(TextNode);
    });

    it('should return FormattingNode with a TextNode as a child with correct text value', () => {
      const name = createInlineToolName('bold');
      const start = 5;
      const end = 8;

      const fragments = node.format(name, start, end);
      const formattingNode = fragments[1] as FormattingNode;

      expect(formattingNode.children[0].getText()).toEqual(initialText.slice(start, end));
    });

    it('should call parent\'s insertAfter with new nodes', () => {
      const name = createInlineToolName('bold');
      const start = 5;
      const end = 8;

      const fragments = node.format(name, start, end);

      expect(parentMock.insertAfter).toBeCalledWith(node, ...fragments);
    });
  });

  describe('.split()', () => {
    const index = 5;

    it('should not split (return null) if index is 0', () => {
      const newNode = node.split(0);

      expect(newNode).toBeNull();
    });

    it('should not split (return null) if index equals text length', () => {
      const newNode = node.split(initialText.length);

      expect(newNode).toBeNull();
    });

    it('should create new TextNode on split', () => {
      const newNode = node.split(index);

      expect(newNode).toBeInstanceOf(TextNode);
    });

    it('should create new TextNode with text value splitted from the original one', () => {
      const newNode = node.split(index);

      expect(newNode?.getText()).toEqual(initialText.slice(index));
    });

    it('should remove split text value from the original node', () => {
      node.split(index);

      expect(node.getText()).toEqual(initialText.slice(0, index));
    });

    it('should insert new node to the parent', () => {
      const newNode = node.split(index);

      expect(parentMock.insertAfter).toBeCalledWith(node, newNode);
    });
  });

  describe('.serialized', () => {
    it('should return text value and empty array of fragments', () => {
      const result = node.serialized;

      expect(result).toEqual({
        text: initialText,
        fragments: [],
      });
    });
  });
});
