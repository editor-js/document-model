import { createTextNodeMock } from '../../../mocks/TextNode.mock';
import { createParentNodeMock } from '../../../mocks/ParentNode.mock';
import { beforeEach, describe, expect, it } from '@jest/globals';
import type { TextNode } from '../TextNode';
import { createInlineToolData, createInlineToolName, FormattingNode } from '../FormattingNode';
import type { ParentNode } from '../mixins/ParentNode';

describe('FormattingNode', () => {
  let parentMock: ParentNode;
  let childMock: TextNode;
  let anotherChildMock: TextNode;

  const tool = createInlineToolName('bold');
  const anotherTool = createInlineToolName('italic');
  const data = createInlineToolData({});
  let node: FormattingNode;

  beforeEach(() => {
    parentMock = createParentNodeMock() as FormattingNode;
    childMock = createTextNodeMock('Some text here. ');
    anotherChildMock = createTextNodeMock('Another text here.');

    node = new FormattingNode({
      tool,
      data,
      parent: parentMock,
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

    it('should call getText() for the relevant child', () => {
      node.getText(start, end);

      expect(childMock.getText).toBeCalledWith(start, end);
    });

    it('should adjust index by child offset', () => {
      const offset = childMock.length;

      node.getText(offset + start, offset + end);

      expect(anotherChildMock.getText).toBeCalledWith(start, end);
    });

    it('should call getText for all relevant children', () => {
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
    it('should return fragments for sub-tree', () => {
      const parentNode = new FormattingNode({
        tool: anotherTool,
        data,
        children: [ node ],
      });

      const fragments = parentNode.getFragments();

      expect(fragments).toEqual([
        {
          tool: anotherTool,
          data,
          range: [0, parentNode.length],
        },
        {
          tool,
          data,
          range: [0, node.length],
        },
      ]);
    });

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

  describe('.unformat()', () => {
    const start = 3;
    const end = 5;
    let childFormattingNode: FormattingNode;
    let anotherChildFormattingNode: FormattingNode;

    beforeEach(() => {
      childFormattingNode =   new FormattingNode({
        tool: anotherTool,
        data,
        children: [ createTextNodeMock('Some text here. ') ],
      });

      anotherChildFormattingNode = new FormattingNode({
        tool: anotherTool,
        data,
        children: [ createTextNodeMock('Another text here. ') ] }
      );


      node = new FormattingNode({
        tool,
        data,
        parent: parentMock as FormattingNode,
        children: [childFormattingNode, anotherChildFormattingNode],
      });

      jest.spyOn(childFormattingNode, 'unformat');
      jest.spyOn(anotherChildFormattingNode, 'unformat');
    });

    it('should remove formatting from the relevant child', () => {
      node.unformat(anotherTool, start, end);

      expect(childFormattingNode.unformat).toBeCalledWith(anotherTool, start, end);
    });

    it('should adjust index by child offset', () => {
      const offset = childFormattingNode.length;

      node.unformat(anotherTool, offset + start, offset + end);

      expect(anotherChildFormattingNode.unformat).toBeCalledWith(anotherTool, start, end);
    });

    it('should call unformat for all relevant children', () => {
      const offset = childMock.length;

      node.unformat(anotherTool, start, offset + end);

      expect(childFormattingNode.unformat).toBeCalledWith(anotherTool, start, offset);
      expect(anotherChildFormattingNode.unformat).toBeCalledWith(anotherTool, 0, end);
    });

    it('should do nothing if different tool is being unformatted', () => {
      node.unformat(tool, start, end);

      expect(childFormattingNode.unformat).not.toBeCalled();
      expect(anotherChildFormattingNode.unformat).not.toBeCalled();
    });

    it('should return array of new nodes with unformatted part', () => {
      const result = node.unformat(anotherTool, start, end);

      expect(result).toEqual([
        expect.any(FormattingNode),
        /**
         * On this place is unformatted TextNode mock
         */
        expect.any(Object),
        expect.any(FormattingNode)]);
    });

    it('should do nothing for TextNode children', () => {
      const result = childFormattingNode.unformat(tool, start, end);

      expect(result).toEqual([]);
    });
  });
});
