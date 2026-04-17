/* eslint-disable @typescript-eslint/no-magic-numbers, jsdoc/require-jsdoc */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getAbsoluteRangeOffset } from './getAbsoluteRangeOffset.js';
import {
  getClippedTextRangeForInput,
  isInputContainsOnlyEndOfSelection,
  isInputContainsOnlyStartOfSelection,
  isInputContainsWholeSelection,
  isInputInBetweenSelection
} from './selectionRangeInInput.js';

jest.mock('./getAbsoluteRangeOffset.js', () => ({
  getAbsoluteRangeOffset: jest.fn(),
}));

const mockedGetAbsoluteRangeOffset = jest.mocked(getAbsoluteRangeOffset);

describe('getClippedTextRangeForInput', () => {
  beforeEach(() => {
    mockedGetAbsoluteRangeOffset.mockReset();
  });

  it('returns null when the range does not intersect the input', () => {
    const input = {
      textContent: 'x',
      contains: () => false,
    } as unknown as HTMLElement;

    const range = {
      intersectsNode: () => false,
      startContainer: {} as Node,
      endContainer: {} as Node,
      startOffset: 0,
      endOffset: 0,
    } as unknown as Range;

    expect(getClippedTextRangeForInput(range, input)).toBeNull();
    expect(mockedGetAbsoluteRangeOffset).not.toHaveBeenCalled();
  });

  it('returns [0, textLength] when anchors lie outside the input (middle block in CIS)', () => {
    const anchorInOtherBlockA = {} as Node;
    const anchorInOtherBlockB = {} as Node;

    const input = {
      textContent: 'middle',
      contains: () => false,
    } as unknown as HTMLElement;

    const range = {
      startContainer: anchorInOtherBlockA,
      endContainer: anchorInOtherBlockB,
      startOffset: 0,
      endOffset: 0,
      intersectsNode(node: Node) {
        return node === input;
      },
    } as unknown as Range;

    expect(getClippedTextRangeForInput(range, input)).toEqual([0, 6]);
    expect(mockedGetAbsoluteRangeOffset).not.toHaveBeenCalled();
  });

  it('returns [0, 0] for middle input when textContent is empty', () => {
    const anchorA = {} as Node;
    const anchorB = {} as Node;

    const input = {
      textContent: '',
      contains: () => false,
    } as unknown as HTMLElement;

    const range = {
      startContainer: anchorA,
      endContainer: anchorB,
      startOffset: 0,
      endOffset: 0,
      intersectsNode(node: Node) {
        return node === input;
      },
    } as unknown as Range;

    expect(getClippedTextRangeForInput(range, input)).toEqual([0, 0]);
    expect(mockedGetAbsoluteRangeOffset).not.toHaveBeenCalled();
  });

  it('returns [start, textLength] when only the start anchor is inside the input', () => {
    const startNode = {} as Node;
    const endNode = {} as Node;

    const input = {
      textContent: 'hello',
      contains(node: Node) {
        return node === startNode;
      },
    } as unknown as HTMLElement;

    const range = {
      startContainer: startNode,
      endContainer: endNode,
      startOffset: 2,
      endOffset: 0,
      intersectsNode: () => true,
    } as unknown as Range;

    mockedGetAbsoluteRangeOffset.mockReturnValueOnce(2);

    expect(getClippedTextRangeForInput(range, input)).toEqual([2, 5]);
    expect(mockedGetAbsoluteRangeOffset).toHaveBeenCalledTimes(1);
    expect(mockedGetAbsoluteRangeOffset).toHaveBeenCalledWith(input, startNode, 2);
  });

  it('returns [0, end] when only the end anchor is inside the input', () => {
    const startNode = {} as Node;
    const endNode = {} as Node;

    const input = {
      textContent: 'hello',
      contains(node: Node) {
        return node === endNode;
      },
    } as unknown as HTMLElement;

    const range = {
      startContainer: startNode,
      endContainer: endNode,
      startOffset: 0,
      endOffset: 3,
      intersectsNode: () => true,
    } as unknown as Range;

    mockedGetAbsoluteRangeOffset.mockReturnValueOnce(3);

    expect(getClippedTextRangeForInput(range, input)).toEqual([0, 3]);
    expect(mockedGetAbsoluteRangeOffset).toHaveBeenCalledTimes(1);
    expect(mockedGetAbsoluteRangeOffset).toHaveBeenCalledWith(input, endNode, 3);
  });

  it('returns [start, end] when both anchors are inside the input', () => {
    const startNode = {} as Node;
    const endNode = {} as Node;

    const input = {
      textContent: 'hello',
      contains(node: Node) {
        return node === startNode || node === endNode;
      },
    } as unknown as HTMLElement;

    const range = {
      startContainer: startNode,
      endContainer: endNode,
      startOffset: 1,
      endOffset: 4,
      intersectsNode: () => true,
    } as unknown as Range;

    mockedGetAbsoluteRangeOffset.mockReturnValueOnce(1).mockReturnValueOnce(4);

    expect(getClippedTextRangeForInput(range, input)).toEqual([1, 4]);
    expect(mockedGetAbsoluteRangeOffset).toHaveBeenCalledTimes(2);
  });

  it('normalizes range when offsets yield start greater than end inside one input', () => {
    const startNode = {} as Node;
    const endNode = {} as Node;

    const input = {
      textContent: 'hello',
      contains(node: Node) {
        return node === startNode || node === endNode;
      },
    } as unknown as HTMLElement;

    const range = {
      startContainer: startNode,
      endContainer: endNode,
      startOffset: 4,
      endOffset: 1,
      intersectsNode: () => true,
    } as unknown as Range;

    mockedGetAbsoluteRangeOffset.mockReturnValueOnce(4).mockReturnValueOnce(1);

    expect(getClippedTextRangeForInput(range, input)).toEqual([1, 4]);
  });
});

describe('selection range vs input (cross-input helpers)', () => {
  it('isInputContainsWholeSelection is true when both anchors are in the input', () => {
    const a = {} as Node;
    const b = {} as Node;
    const input = {
      contains(node: Node) {
        return node === a || node === b;
      },
    } as unknown as HTMLElement;
    const range = {
      startContainer: a,
      endContainer: b,
    } as AbstractRange;

    expect(isInputContainsWholeSelection(input, range)).toBe(true);
  });

  it('isInputContainsOnlyStartOfSelection matches start-in only', () => {
    const startNode = {} as Node;
    const endNode = {} as Node;
    const input = {
      contains(node: Node) {
        return node === startNode;
      },
    } as unknown as HTMLElement;
    const range = {
      startContainer: startNode,
      endContainer: endNode,
    } as AbstractRange;

    expect(isInputContainsOnlyStartOfSelection(input, range)).toBe(true);
    expect(isInputContainsOnlyEndOfSelection(input, range)).toBe(false);
    expect(isInputContainsWholeSelection(input, range)).toBe(false);
    expect(isInputInBetweenSelection(input, range)).toBe(false);
  });

  it('isInputInBetweenSelection is true when neither anchor is in the input', () => {
    const startNode = {} as Node;
    const endNode = {} as Node;
    const input = {
      contains: () => false,
    } as unknown as HTMLElement;
    const range = {
      startContainer: startNode,
      endContainer: endNode,
    } as AbstractRange;

    expect(isInputInBetweenSelection(input, range)).toBe(true);
  });
});
