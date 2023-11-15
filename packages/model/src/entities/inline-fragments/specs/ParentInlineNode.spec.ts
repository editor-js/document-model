import type { InlineToolName, ChildNode } from '../index';
import { TextInlineNode, FormattingInlineNode } from '../index.js';
import { ParentInlineNode } from '../ParentInlineNode/index.js';
import type { InlineNode } from '../InlineNode';
import { EventType } from '../../../utils/EventBus/types/EventType.js';
import {
  TextAddedEvent,
  TextFormattedEvent,
  TextRemovedEvent,
  TextUnformattedEvent
} from '../../../utils/EventBus/events/index.js';
import { EventAction } from '../../../utils/EventBus/types/EventAction.js';
import { createInlineToolData } from '../index.js';

jest.mock('../TextInlineNode');
jest.mock('../FormattingInlineNode');

describe('ParentInlineNode', () => {
  let childMock: TextInlineNode;
  let anotherChildMock: TextInlineNode;
  let formattingNodeMock: FormattingInlineNode;
  let anotherFormattingNodeMock: FormattingInlineNode;
  let children: ChildNode[];

  let node: ParentInlineNode;

  beforeEach(() => {
    childMock = new TextInlineNode({ value: 'Some text here. ' });
    anotherChildMock = new TextInlineNode({ value: 'Another text here.' });
    formattingNodeMock = new FormattingInlineNode({
      tool: 'bold' as InlineToolName,
      children: [ anotherChildMock ],
    });
    anotherFormattingNodeMock = new FormattingInlineNode({
      tool: 'italic' as InlineToolName,
      children: [ new TextInlineNode({ value: 'Some italic text.' }) ],
    });

    children = [childMock, formattingNodeMock, anotherFormattingNodeMock];

    node = new ParentInlineNode({
      children: children,
    });
  });

  describe('.length', () => {
    it('should return sum of lengths of children', () => {
      expect(node.length).toEqual(childMock.length + formattingNodeMock.length + anotherFormattingNodeMock.length);
    });
  });

  describe('.serialized', () => {
    it('should get node\'s text', () => {
      const spy = jest.spyOn(node, 'getText');

      node.serialized;

      expect(spy).toHaveBeenCalled();
    });

    it('should get node\'s fragments', () => {
      const spy = jest.spyOn(node, 'getFragments');

      node.serialized;

      expect(spy).toHaveBeenCalled();
    });

    it('should have correct data format', () => {
      const result = node.serialized;

      expect(result).toHaveProperty('value');
      expect(result).toHaveProperty('fragments');
    });
  });

  describe('.getText()', () => {
    const start = 3;
    const end = 5;

    it('should throw an error if start index is invalid', () => {
      expect(() => node.getText(-1)).toThrowError();
      expect(() => node.getText(node.length + 1)).toThrowError();
    });

    it('should throw an error if end index is invalid', () => {
      expect(() => node.getText(0, -1)).toThrowError();
      expect(() => node.getText(0, node.length + 1)).toThrowError();
    });

    it('should throw an error if end is less than start', () => {
      expect(() => node.getText(end, start)).toThrowError();
    });

    it('should call getText() for the relevant child', () => {
      const spy = jest.spyOn(childMock, 'getText');

      node.getText(start, end);

      expect(spy).toBeCalledWith(start, end);
    });

    it('should adjust index by child offset', () => {
      const spy = jest.spyOn(formattingNodeMock, 'getText');

      const offset = childMock.length;

      node.getText(offset + start, offset + end);

      expect(spy).toBeCalledWith(start, end);
    });


    it('should not call getText() for previous child if start equals its length', () => {
      const spy = jest.spyOn(childMock, 'getText');

      const childLength = childMock.length;

      node.getText(childLength, childLength + end);

      expect(spy).not.toBeCalled();
    });

    it('should not call getText() for next child if end equals its start index', () => {
      const spy = jest.spyOn(formattingNodeMock, 'getText');

      node.getText(start, childMock.length);

      expect(spy).not.toBeCalled();
    });

    it('should not call getText() for if start equals end', () => {
      const spy = jest.spyOn(childMock, 'getText');

      node.getText(start, start);

      expect(spy).not.toBeCalled();
    });

    it('should call getText for all relevant children', () => {
      const spy = jest.spyOn(childMock, 'getText');
      const anotherSpy = jest.spyOn(formattingNodeMock, 'getText');
      const offset = childMock.length;

      node.getText(start, offset + end);

      expect(spy).toBeCalledWith(start, offset);
      expect(anotherSpy).toBeCalledWith(0, end);
    });

    it('should return all text by default', () => {
      const spy = jest.spyOn(childMock, 'getText');
      const anotherSpy = jest.spyOn(formattingNodeMock, 'getText');

      node.getText();

      expect(spy).toBeCalledWith(0, childMock.length);
      expect(anotherSpy).toBeCalledWith(0, anotherChildMock.length);
    });
  });

  describe('.insertText()', () => {
    const newText = 'new text';
    const index = 3;

    it('should throw a error if index is invalid', () => {
      expect(() => node.insertText(newText, -1)).toThrowError();
      expect(() => node.insertText(newText, node.length + 1)).toThrowError();
    });

    it('should create empty text node if node is empty', () => {
      node = new ParentInlineNode();

      node.insertText(newText);

      expect(node.children).toEqual([ expect.any(TextInlineNode) ]);
    });

    it('should not append empty node if there is already a child node', () => {
      const spy = jest.spyOn(node, 'append');

      node.insertText(newText);

      expect(spy).not.toBeCalled();
    });

    it('should call insertText() of the child with the passed index', () => {
      const spy = jest.spyOn(childMock, 'insertText');

      node.insertText(newText, index);

      expect(spy).toBeCalledWith(newText, index);
    });

    it('should adjust index by child offset', () => {
      const spy = jest.spyOn(formattingNodeMock, 'insertText');

      const offset = childMock.length;

      node.insertText(newText, index + offset);

      expect(spy).toBeCalledWith(newText, index);
    });

    it('should append text to the last child by default', () => {
      const spy = jest.spyOn(anotherFormattingNodeMock, 'insertText');

      node.insertText(newText);

      expect(spy).toBeCalledWith(newText, anotherFormattingNodeMock.length);
    });

    it('should normalize subtree on insertion', () => {
      const spy = jest.spyOn(node, 'normalize');

      node.insertText(newText);

      expect(spy).toBeCalled();
    });

    it('should emit TextAddedEvent with correct text as data and text range as index', () => {
      let event: TextAddedEvent | null = null;

      node.addEventListener(EventType.Changed, e => event = e as TextAddedEvent);

      node.insertText(newText, index);

      expect(event).toBeInstanceOf(TextAddedEvent);
      expect(event).toHaveProperty('detail', expect.objectContaining({
        action: EventAction.Added,
        index: [ [index, index + newText.length] ],
        data: newText,
      }));
    });
  });

  describe('.removeText()', () => {
    const start = 3;
    const end = 5;

    it('should throw a error if start index is invalid', () => {
      expect(() => node.removeText(-1)).toThrowError();
      expect(() => node.removeText(node.length + 1)).toThrowError();
    });

    it('should throw an error if end index is invalid', () => {
      expect(() => node.removeText(0, -1)).toThrowError();
      expect(() => node.removeText(0, node.length + 1)).toThrowError();
    });

    it('should throw an error if end is less than start', () => {
      expect(() => node.removeText(end, start)).toThrowError();
    });

    it('should remove text from appropriate child', () => {
      const spy = jest.spyOn(childMock, 'removeText');

      node.removeText(start, end);

      expect(spy).toBeCalledWith(start, end);
    });

    it('should adjust indices by child offset', () => {
      const spy = jest.spyOn(formattingNodeMock, 'removeText');

      const offset = childMock.length;

      node.removeText(offset + start, offset + end);

      expect(spy).toBeCalledWith(start, end);
    });

    it('should call removeText for each affected child', () => {
      const spy = jest.spyOn(childMock, 'removeText');
      const anotherSpy = jest.spyOn(formattingNodeMock, 'removeText');

      const offset = childMock.length;

      node.removeText(start, offset + end);

      expect(spy).toBeCalledWith(start, offset);
      expect(anotherSpy).toBeCalledWith(0, end);
    });

    it('should remove all text by default', () => {
      const spy = jest.spyOn(childMock, 'removeText');
      const anotherSpy = jest.spyOn(formattingNodeMock, 'removeText');

      node.removeText();

      expect(spy).toBeCalledWith(0, childMock.length);
      expect(anotherSpy).toBeCalledWith(0, formattingNodeMock.length);
    });

    it('should normalize subtree on removal', () => {
      const spy = jest.spyOn(node, 'normalize');

      node.removeText();

      expect(spy).toBeCalled();
    });

    it('should emit TextRemovedEvent with removed text as data and range as index', () => {
      let event: TextRemovedEvent | null = null;

      node.addEventListener(EventType.Changed, e => event = e as TextRemovedEvent);

      node.removeText(start, end);

      expect(event).toBeInstanceOf(TextRemovedEvent);
      expect(event).toHaveProperty('detail', expect.objectContaining({
        action: EventAction.Removed,
        index: [ [start, end] ],
      }));
    });
  });

  describe('.getFragments()', () => {
    let start: number;
    let end: number;
    const offset = 3;

    beforeEach(() => {
      start = childMock.length;
      end = start + offset;
    });

    it('should throw a error if start index is invalid', () => {
      expect(() => node.getFragments(-1)).toThrowError();
      expect(() => node.getFragments(node.length + 1)).toThrowError();
    });

    it('should throw an error if end index is invalid', () => {
      expect(() => node.getFragments(0, -1)).toThrowError();
      expect(() => node.getFragments(0, node.length + 1)).toThrowError();
    });

    it('should throw an error if end is less than start', () => {
      expect(() => node.getFragments(end, start)).toThrowError();
    });

    it('should call getFragments for relevant children', () => {
      const spyToBeCalled = jest.spyOn(formattingNodeMock, 'getFragments');
      const spyNotToBeCalled = jest.spyOn(anotherFormattingNodeMock, 'getFragments');

      node.getFragments(start, end);

      expect(spyToBeCalled).toBeCalledWith(start - childMock.length, end - childMock.length);
      expect(spyNotToBeCalled).not.toBeCalled();
    });

    it('should not get fragments for text nodes', () => {
      const result = node.getFragments(0, start - 1);

      expect(result).toHaveLength(0);
    });

    it('should normalize fragments for same tools', () => {
      jest
        .spyOn(formattingNodeMock, 'getFragments')
        .mockImplementationOnce(() => ([
          {
            tool: 'bold' as InlineToolName,
            range: [0, formattingNodeMock.length],
          },
        ]));
      jest
        .spyOn(anotherFormattingNodeMock, 'getFragments')
        .mockImplementationOnce(() => ([
          {
            tool: 'bold' as InlineToolName,
            range: [0, anotherFormattingNodeMock.length],
          },
        ]));

      const result = node.getFragments();

      expect(result).toEqual([ {
        tool: 'bold',
        range: [childMock.length, node.length],
      } ]);
    });

    it('should not normalize fragments for different tools', () => {
      jest
        .spyOn(formattingNodeMock, 'getFragments')
        .mockImplementationOnce(() => ([
          {
            tool: 'bold' as InlineToolName,
            range: [0, formattingNodeMock.length],
          },
        ]));
      jest
        .spyOn(anotherFormattingNodeMock, 'getFragments')
        .mockImplementationOnce(() => ([
          {
            tool: 'italic' as InlineToolName,
            range: [0, anotherFormattingNodeMock.length],
          },
        ]));

      const result = node.getFragments();

      expect(result).toEqual([
        {
          tool: 'bold',
          range: [childMock.length, childMock.length + formattingNodeMock.length],
        },
        {
          tool: 'italic',
          range: [childMock.length + formattingNodeMock.length, node.length],
        },
      ]);
    });
  });

  describe('.format()', () => {
    const start = 3;
    const end = 5;
    const tool = 'bold' as InlineToolName;

    it('should throw a error if start index is invalid', () => {
      expect(() => node.format(tool, -1, 0)).toThrowError();
      expect(() => node.format(tool, node.length + 1, node.length)).toThrowError();
    });

    it('should throw an error if end index is invalid', () => {
      expect(() => node.format(tool, 0, -1)).toThrowError();
      expect(() => node.format(tool, 0, node.length + 1)).toThrowError();
    });

    it('should throw an error if end is less than start', () => {
      expect(() => node.format(tool, end, start)).toThrowError();
    });

    it('should not throw an error if end equals start', () => {
      expect(() => node.format(tool, start, start)).not.toThrowError();
    });

    it('should apply formatting to the relevant child', () => {
      const spy = jest.spyOn(childMock, 'format');

      node.format(tool, start, end);

      expect(spy).toBeCalledWith(tool, start, end, undefined);
    });

    it('should adjust index by child offset', () => {
      const spy = jest.spyOn(formattingNodeMock, 'format');

      const offset = childMock.length;

      node.format(tool, offset + start, offset + end);

      expect(spy).toBeCalledWith(tool, start, end, undefined);
    });

    it('should format all relevant children', () => {
      const spy = jest.spyOn(childMock, 'format');
      const anotherSpy = jest.spyOn(formattingNodeMock, 'format');

      const offset = childMock.length;

      node.format(tool, start, offset + end);

      expect(spy).toBeCalledWith(tool, start, offset, undefined);
      expect(anotherSpy).toBeCalledWith(tool, 0, end, undefined);
    });

    it('should normalize subtree on format', () => {
      const spy = jest.spyOn(node, 'normalize');

      node.format(tool, start, end);

      expect(spy).toBeCalled();
    });

    it('should emit TextFormattedEvent with inline fragment as data and affected range as index', () => {
      let event: TextFormattedEvent | null = null;
      const data = createInlineToolData({
        url: 'https://editorjs.io',
      });

      node.addEventListener(EventType.Changed, e => event = e as TextFormattedEvent);

      node.format(tool, start, end, data);

      expect(event).toBeInstanceOf(TextFormattedEvent);
      expect(event).toHaveProperty('detail', expect.objectContaining({
        action: EventAction.Modified,
        index: [ [start, end] ],
        data: {
          tool,
          data,
        },
      }));
    });
  });

  describe('.unformat()', () => {
    let start: number;
    let end: number;

    const tool = 'bold' as InlineToolName;

    beforeEach(() => {
      start = childMock.length;
      end = childMock.length + Math.round(formattingNodeMock.length / 2);
    });

    it('should remove formatting from the relevant child', () => {
      const spy = jest.spyOn(formattingNodeMock, 'unformat');

      node.unformat(tool, start, end);

      expect(spy).toBeCalledWith(tool, start - childMock.length, end - childMock.length);
    });

    it('should call unformat for all relevant children', () => {
      const spy = jest.spyOn(formattingNodeMock, 'unformat');
      const anotherSpy = jest.spyOn(anotherFormattingNodeMock, 'unformat');

      const offset = formattingNodeMock.length;

      node.unformat(tool, start, offset + end);

      expect(spy).toBeCalledWith(tool, start - childMock.length, offset);
      expect(anotherSpy).toBeCalledWith(tool, 0, end - childMock.length);
    });

    it('should not unformat text nodes', () => {
      const result = node.unformat(tool, 0, start - 1);

      expect(result).toHaveLength(0);
    });

    it('should normalize subtree on unformat', () => {
      const spy = jest.spyOn(node, 'normalize');

      node.unformat(tool, start, end);

      expect(spy).toBeCalled();
    });

    it('should emit TextUnformattedEvent with inline fragment as data and range as index', () => {
      let event: TextUnformattedEvent | null = null;

      node.addEventListener(EventType.Changed, e => event = e as TextUnformattedEvent);

      node.unformat(tool, start, end);

      expect(event).toBeInstanceOf(TextUnformattedEvent);
      expect(event).toHaveProperty('detail', expect.objectContaining({
        action: EventAction.Modified,
        index: [ [start, end] ],
        data: {
          tool,
        },
      }));
    });
  });

  describe('.isEqual()', () => {
    it('should return true for InlineParentNode', () => {
      const result = node.isEqual(new ParentInlineNode());

      expect(result).toEqual(true);
    });

    it('should return false for anything else', () => {
      const result = node.isEqual({} as InlineNode);

      expect(result).toEqual(false);
    });
  });
});
