import type { ChildNode } from '../index';
import { TextInlineNode, createInlineToolData, createInlineToolName, FormattingInlineNode } from '../index.js';
import type { ParentNode } from '../mixins/ParentNode';
import type { InlineNode } from '../InlineNode';
import { ParentInlineNode } from '../ParentInlineNode/index.js';

jest.mock('../ParentInlineNode');
jest.mock('../TextInlineNode');

describe('FormattingInlineNode', () => {
  let parent: ParentNode;
  let firstChildMock: TextInlineNode;
  let secondChildMock: TextInlineNode;
  let thirdChildMock: TextInlineNode;

  const tool = createInlineToolName('bold');
  const anotherTool = createInlineToolName('italic');
  const data = createInlineToolData({});
  let node: FormattingInlineNode;
  let children: ChildNode[];

  beforeEach(() => {
    parent = new FormattingInlineNode({ tool: createInlineToolName('parentTool') });
    firstChildMock = new TextInlineNode({ value: 'Some text here. ' });
    secondChildMock = new TextInlineNode({ value: 'Another text here.' });
    thirdChildMock = new TextInlineNode({ value: 'Some more text.' });

    children = [firstChildMock, secondChildMock, thirdChildMock];

    node = new FormattingInlineNode({
      tool,
      data,
      parent,
      children,
    });

    jest.clearAllMocks();
  });

  describe('.removeText()', () => {
    it('should call parents removeText() method', () => {
      const start = 0;
      const end = 3;

      const spy = jest.spyOn(ParentInlineNode.prototype, 'removeText');

      node.removeText(start, end);

      expect(spy).toBeCalledWith(start, end);
    });

    it('should return removed text', () => {
      const removedText = 'Editor.js is a block-styled editor';

      jest.spyOn(FormattingInlineNode.prototype, 'removeText').mockImplementationOnce(() => removedText);

      const result = node.removeText();

      expect(result).toEqual(removedText);
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

  describe('.getFragments()', () => {
    it('should call parents getFragments() method', () => {
      const start = 0;
      const end = 3;

      const spy = jest.spyOn(ParentInlineNode.prototype, 'getFragments');

      node.getFragments(start, end);

      expect(spy).toBeCalledWith(start, end);
    });

    it('should add own data as first fragment within passed start and end', () => {
      const start = 0;
      const end = 3;

      const result = node.getFragments(start, end);

      expect(result[0]).toEqual(expect.objectContaining({
        tool: node.tool,
        range: [start, end],
      }));
    });

    it('should add tool\'s data if it exists', () => {
      const result = node.getFragments();

      expect(result[0]).toHaveProperty('data', data);
    });

    it('should not add tool\'s data if it doesn\'t exist', () => {
      node = new FormattingInlineNode({ tool });

      const result = node.getFragments();

      expect(result[0]).not.toHaveProperty('data');
    });
  });

  describe('.split()', () => {
    const index = 5;

    it('should throw an error if index is invalid', () => {
      expect(() => node.split(-1)).toThrowError();
      expect(() => node.split(node.length + 1)).toThrowError();
    });

    it('should not split (return null) if index is 0', () => {
      const newNode = node.split(0);

      expect(newNode).toBeNull();
    });

    it('should not split (return null) if index equals text length', () => {
      const newNode = node.split(node.length);

      expect(newNode).toBeNull();
    });

    it('should create new FormattingInlineNode on split', () => {
      const newNode = node.split(index);

      expect(newNode).toBeInstanceOf(FormattingInlineNode);
    });

    it('should create new FormattingInlineNode with children split from the original one', () => {
      const newNode = node.split(firstChildMock.length);

      expect(newNode?.children).toEqual([secondChildMock, thirdChildMock]);
    });

    it('should call split method of child containing the specified index', () => {
      const spy = jest.spyOn(secondChildMock, 'split');

      node.split(index + firstChildMock.length);

      expect(spy).toBeCalledWith(index);
    });

    it('should insert new node to the parent', () => {
      const spy = jest.spyOn(parent, 'insertAfter');

      const newNode = node.split(index);

      expect(spy).toBeCalledWith(node, newNode);
    });
  });

  describe('.format()', () => {
    const start = 3;
    const end = 5;

    it('should return empty array if formatting is already applied', () => {
      const result = node.format(tool, start, end);

      expect(result).toHaveLength(0);
    });

    it('should call parent format() method', () => {
      const spy = jest.spyOn(ParentInlineNode.prototype, 'format');

      node.format(anotherTool, start, end, data);

      expect(spy).toBeCalledWith(anotherTool, start, end, data);
    });
  });

  describe('.unformat()', () => {
    const start = 3;
    const end = 5;
    let childNode: TextInlineNode;

    beforeEach(() => {
      parent = new FormattingInlineNode({ tool: createInlineToolName('parentTool') });

      childNode = new TextInlineNode({
        value: 'Editor.js is a block-styled editor',
      });

      node = new FormattingInlineNode({
        tool,
        data,
        parent: parent as FormattingInlineNode,
        children: [ childNode ],
      });
    });

    it('should call parents unformat() method if tools are unequal', () => {
      const spy = jest.spyOn(ParentInlineNode.prototype, 'unformat');

      node.unformat(anotherTool, start, end);

      expect(spy).toBeCalledWith(anotherTool, start, end);
    });

    it('should not call parent unformat() method if tools are equal', () => {
      const spy = jest.spyOn(ParentInlineNode.prototype, 'unformat');

      node.unformat(tool, start, end);

      expect(spy).not.toBeCalled();
    });

    it('should split node into two if unformatting applied from the start to the middle of the text', () => {
      const result = node.unformat(tool, 0, end);

      expect(result).toEqual([
        expect.any(TextInlineNode),
        expect.any(FormattingInlineNode),
      ]);
    });

    it('should remove unformatted node from parent if unformatting applied from the start to the middle of the text', () => {
      const result = node.unformat(tool, 0, end);

      expect(parent.children).toHaveLength(result.length);
    });

    it('should split node into tree if unformatting applied in the middle of the node', () => {
      const result = node.unformat(tool, start, end);

      expect(result).toEqual([
        expect.any(FormattingInlineNode),
        expect.any(TextInlineNode),
        expect.any(FormattingInlineNode),
      ]);
    });

    it('should remove unformatted node from parent if unformatting applied in the middle of the node', () => {
      const result = node.unformat(tool, start, end);

      expect(parent.children).toHaveLength(result.length);
    });

    it('should split node into two if unformatting applied at the end of the node', () => {
      const result = node.unformat(tool, end, node.length);

      expect(result).toEqual([
        expect.any(FormattingInlineNode),
        expect.any(TextInlineNode),
      ]);
    });

    it('should remove unformatted node from parent if unformatting applied at the end of the node', () => {
      const result = node.unformat(tool, end, node.length);

      expect(parent.children).toHaveLength(result.length);
    });
  });

  describe('.isEqual()', () => {
    it('should return true for FormattingInlineNode with the same tool name', () => {
      const nodeToCompare = new FormattingInlineNode({ tool });

      expect(node.isEqual(nodeToCompare)).toEqual(true);
    });

    it('should return false for not FormattingInlineNode object', () => {
      const nodeToCompare = {} as InlineNode;

      expect(node.isEqual(nodeToCompare)).toEqual(false);
    });

    it('should return false for FormattingInlineNode with another tool name', () => {
      const nodeToCompare = new FormattingInlineNode({ tool: anotherTool });

      expect(node.isEqual(nodeToCompare)).toEqual(false);
    });
  });

  describe('.mergeWith()', () => {
    it('should append children of merged node to the current', () => {
      const child = new TextInlineNode({ value: 'Text node' });
      const nodeToMerge = new FormattingInlineNode({
        tool,
        children: [ child ],
      });

      const spy = jest.spyOn(node, 'append');

      node.mergeWith(nodeToMerge);

      expect(spy).toBeCalledWith(child);
    });

    it('should remove merged node', () => {
      const nodeToMerge = new FormattingInlineNode({ tool });

      const spy = jest.spyOn(nodeToMerge, 'remove');

      node.mergeWith(nodeToMerge);

      expect(spy).toBeCalled();
    });

    it('should throw an error if node to merge is not equal to the current', () => {
      const nodeToMerge = new FormattingInlineNode({ tool: anotherTool });

      expect(() => node.mergeWith(nodeToMerge)).toThrow();
    });
  });
});
