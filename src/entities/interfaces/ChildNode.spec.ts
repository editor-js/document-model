import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ChildNode } from './ChildNode';
import type { ParentNode } from './ParentNode';

const parentMock = {
  append: jest.fn(),
  removeChild: jest.fn(),
  insertAfter: jest.fn(),
  children: [],
} as unknown as ParentNode;

interface Dummy extends ChildNode {
}

/**
 * Dummy Node's class
 */
@ChildNode
class Dummy {
  /**
   *
   * @param _options - dummy options
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function,@typescript-eslint/no-unused-vars,no-unused-vars
  constructor(_options?: unknown) {}
}

describe('ChildNode decorator', () => {
  let dummy: Dummy;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('.parent', () => {
    it('should set null to parent by default', () => {
      dummy = new Dummy();

      expect(dummy.parent).toBeNull();
    });

    it('should set passed parent', () => {
      dummy = new Dummy({ parent: parentMock });

      expect(dummy.parent).toEqual(parentMock);
    });

    it('should append child to parent', () => {
      dummy = new Dummy({ parent: parentMock });

      expect(parentMock.append).toBeCalledWith(dummy);
    });
  });

  describe('.remove()', () => {
    beforeEach(() => {
      dummy = new Dummy({
        parent: parentMock,
      });
    });

    it('should add remove method', () => {
      expect(dummy.remove).toBeInstanceOf(Function);
    });

    it('should call parent\'s removeChild method', () => {
      dummy.remove();

      expect(parentMock.removeChild).toBeCalledWith(dummy);
    });

    it('should set node\'s parent to null', () => {
      dummy.remove();

      expect(dummy.parent).toBeNull();
    });
  });

  describe('.appendTo()', () => {
    beforeEach(() => {
      dummy = new Dummy();
    });

    it('should add appendTo method', () => {
      expect(dummy.appendTo).toBeInstanceOf(Function);
    });


    it('should call parent\'s append method on appendTo call', () => {
      dummy.appendTo(parentMock);

      expect(parentMock.append).toBeCalledWith(dummy);
    });

    it('should set node\'s parent on appendTo call', () => {
      dummy.appendTo(parentMock);

      expect(dummy.parent).toBe(parentMock);
    });

    it('should do nothing if parents are the same', () => {
      const dummyWithParent = new Dummy({
        parent: parentMock,
      });

      jest.resetAllMocks();

      dummyWithParent.appendTo(parentMock);

      expect(parentMock.append).not.toBeCalled();
    });
  });
});
