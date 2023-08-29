import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ChildNode } from '../mixins/ChildNode';
import type { ParentNode } from '../mixins/ParentNode';
import { createParentNodeMock } from '../../../mocks/ParentNode.mock';

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
  let parentMock: ParentNode;

  beforeEach(() => {
    parentMock = createParentNodeMock();

    jest.resetAllMocks();
  });


  it('should decorated class to a parent', () => {
    dummy = new Dummy({ parent: parentMock });

    expect(parentMock.append).toBeCalledWith(dummy);
  });

  it('should add remove method to the decorated class', () => {
    expect(dummy.remove).toBeInstanceOf(Function);
  });

  it('should add appendTo method to the decorated class', () => {
    expect(dummy.appendTo).toBeInstanceOf(Function);
  });


  describe('.parent', () => {
    it('should return null by default', () => {
      dummy = new Dummy();

      expect(dummy.parent).toBeNull();
    });

    it('should return parent passed via constructor', () => {
      dummy = new Dummy({ parent: parentMock });

      expect(dummy.parent).toEqual(parentMock);
    });
  });

  describe('.remove()', () => {
    beforeEach(() => {
      dummy = new Dummy({
        parent: parentMock,
      });
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
