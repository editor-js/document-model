import { jest } from '@jest/globals';
import { TextInlineNode, createInlineToolName, FormattingInlineNode } from '../entities/inline-fragments';
import { createChildNodeMock } from './ChildNode.mock';

export const createTextInlineNodeMock = (value: string): TextInlineNode => {
  const childMock = createChildNodeMock();

  return Object.assign(childMock, {
    getText: jest.fn(() => value),
    insertText: jest.fn(),
    removeText: jest.fn(),
    split: jest.fn((index: number) => {
      if (index === 0 || index === value.length) {
        return null;
      }

      const newNode = createTextInlineNodeMock(value.slice(index));

      childMock.parent?.append(newNode);

      value = value.slice(0, index);

      return newNode;
    }),
    format: jest.fn(() => [ new FormattingInlineNode({ tool: createInlineToolName('tool') }) ]),
    length: value.length,
    serialized: value,
    isEqual: jest.fn(() => false),
    normalize: jest.fn(),
  } as unknown as TextInlineNode);
};
