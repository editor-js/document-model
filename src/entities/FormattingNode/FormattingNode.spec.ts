import { beforeEach, describe, expect, it } from '@jest/globals';
import { ParentNode } from '../interfaces';
import { createInlineToolData, createInlineToolName, FormattingNode } from './index';
import { TextNode } from '../TextNode';

const parentMock = {
  insertAfter: jest.fn(),
  removeChild: jest.fn(),
  append: jest.fn(),
  children: [],
} as unknown as ParentNode;

const createChildMock = (value: string): TextNode => ({
  getText: jest.fn(() => value),
  appendTo: jest.fn(),
  insertText: jest.fn(),
  removeText: jest.fn(),
  split: jest.fn(() => null),
  format: jest.fn(() => [ new FormattingNode({ tool: createInlineToolName('tool') }) ]),
  length: value.length,
} as unknown as TextNode);

describe('FormattingNode', () => {
  const childMock = createChildMock('Some text here. ');
  const anotherChildMock = createChildMock('Another text here.');

  const tool = createInlineToolName('bold');
  const anotherTool = createInlineToolName('italic');
  const data = createInlineToolData({});
  let node: FormattingNode;

  beforeEach(() => {
    node = new FormattingNode({
      tool,
      data,
      parent: parentMock as FormattingNode,
      children: [childMock, anotherChildMock],
    });

    jest.clearAllMocks();
  });

  describe('.length', () => {
    it('should return sum of lengths of children', () => {
      expect(node.length).toEqual(childMock.length + anotherChildMock.length);
    });
  });

  describe('.serialized', () => {
    it('should return concatenated text of all fragments with fragments list describing formatting', () => {
      const result = node.serialized;

      expect(result).toEqual({
        text: childMock.getText() + anotherChildMock.getText(),
        fragments: [
          {
            tool,
            data,
            range: [0, node.length],
          },
        ],
      });
    });
  });

  describe('.insertText()', () => {
    const newText = 'new text';
    const index = 3;

    it('should lead calling insertText() of the child with the passed index', () => {
      node.insertText(newText, index);

      expect(childMock.insertText).toBeCalledWith(newText, index);
    });

    it('should adjust index by child offset', () => {
      const offset = childMock.length;

      node.insertText(newText, index + offset);

      expect(anotherChildMock.insertText).toBeCalledWith(newText, index);
    });

    it('should append text to the last child by default', () => {
      node.insertText(newText);

      expect(anotherChildMock.insertText).toBeCalledWith(newText, anotherChildMock.length);
    });
  });

  describe('.removeText()', () => {
    const start = 3;
    const end = 5;

    it('should remove text from appropriate child', () => {
      node.removeText(start, end);

      expect(childMock.removeText).toBeCalledWith(start, end);
    });

    it('should adjust indices by child offset', () => {
      const offset = childMock.length;

      node.removeText(offset + start, offset + end);

      expect(anotherChildMock.removeText).toBeCalledWith(start, end);
    });

    it('should call removeText for each affected child', () => {
      const offset = childMock.length;

      node.removeText(start, offset + end);

      expect(childMock.removeText).toBeCalledWith(start, offset);
      expect(anotherChildMock.removeText).toBeCalledWith(0, end);
    });

    it('should remove all text by default', () => {
      node.removeText();

      expect(childMock.removeText).toBeCalledWith(0, childMock.length);
      expect(anotherChildMock.removeText).toBeCalledWith(0, anotherChildMock.length);
    });

    it('should call remove() if length is 0 after removeText() call', () => {
      const removeSpy = jest.spyOn(node, 'remove');
      const lengthSpy = jest.spyOn(node, 'length', 'get').mockImplementation(() => 0);

      node.removeText();

      expect(removeSpy).toBeCalled();

      removeSpy.mockRestore();
      lengthSpy.mockRestore();
    });
  });

  describe('.getText()', () => {
    const start = 3;
    const end = 5;

    it('should return text from the relevant child', () => {
      node.getText(start, end);

      expect(childMock.getText).toBeCalledWith(start, end);
    });

    it('should adjust index by child offset', () => {
      const offset = childMock.length;

      node.getText(offset + start, offset + end);

      expect(anotherChildMock.getText).toBeCalledWith(start, end);
    });

    it('should return text from all relevant children', () => {
      const offset = childMock.length;

      node.getText(start, offset + end);

      expect(childMock.getText).toBeCalledWith(start, offset);
      expect(anotherChildMock.getText).toBeCalledWith(0, end);
    });

    it('should return all text by default', () => {
      node.getText();

      expect(childMock.getText).toBeCalledWith(0, childMock.length);
      expect(anotherChildMock.getText).toBeCalledWith(0, anotherChildMock.length);
    });
  });

  describe('.getFragments()', () => {
    /**
     * @todo
     */
    it.todo('should return fragments for sub-tree');

    it('should return node\'s fragment', () => {
      const fragments = node.getFragments();

      expect(fragments).toEqual([
        {
          tool,
          data,
          range: [0, node.length],
        },
      ]);
    });
  });

  describe('.split()', () => {
    const index = 5;

    it('should not split (return null) if index is 0', () => {
      const newNode = node.split(0);

      expect(newNode).toBeNull();
    });

    it('should not split (return null) if index equals text length', () => {
      const newNode = node.split(node.length);

      expect(newNode).toBeNull();
    });

    it('should create new FormattingNode on split', () => {
      const newNode = node.split(index);

      expect(newNode).toBeInstanceOf(FormattingNode);
    });

    /**
     * @todo check this and related cases with integration tests
     */
    it('should create new FormattingNode with children split from the original one', () => {
      const newNode = node.split(childMock.length);

      expect(newNode?.children).toEqual([ anotherChildMock ]);
    });

    it('should call split method of child containing the specified index', () => {
      node.split(index);

      expect(childMock.split).toBeCalledWith(index);
    });

    it('should insert new node to the parent', () => {
      const newNode = node.split(index);

      expect(parentMock.insertAfter).toBeCalledWith(node, newNode);
    });
  });

  describe('.format()', () => {
    const start = 3;
    const end = 5;

    it('should apply formatting to the relevant child', () => {
      node.format(anotherTool, start, end);

      expect(childMock.format).toBeCalledWith(anotherTool, start, end, undefined);
    });

    it('should adjust index by child offset', () => {
      const offset = childMock.length;

      node.format(anotherTool, offset + start, offset + end);

      expect(anotherChildMock.format).toBeCalledWith(anotherTool, start, end, undefined);
    });

    it('should format all relevant children', () => {
      const offset = childMock.length;

      node.format(anotherTool, start, offset + end);

      expect(childMock.format).toBeCalledWith(anotherTool, start, offset, undefined);
      expect(anotherChildMock.format).toBeCalledWith(anotherTool, 0, end, undefined);
    });

    it('should do nothing if same tool is being applied', () => {
      node.format(tool, start, end);

      expect(childMock.format).not.toBeCalled();
      expect(anotherChildMock.format).not.toBeCalled();
    });

    it('should return empty array if same tool is being applied', () => {
      const result = node.format(tool, start, end);

      expect(result).toHaveLength(0);
    });

    it('should return array of new formatting nodes', () => {
      const result = node.format(anotherTool, start, end);

      expect(result).toEqual(childMock.format(anotherTool, start, end));
    });
  });
});
