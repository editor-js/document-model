import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ParentNode } from '../mixins/ParentNode';
import { createChildNodeMock } from '../../../mocks/ChildNode.mock';

interface Dummy extends ParentNode {
}

/**
 *
 */
@ParentNode
class Dummy {
  /**
   *
   * @param _options - dummy options
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function,@typescript-eslint/no-unused-vars,no-unused-vars
  constructor(_options?: unknown) {}
}

describe('ParentNode decorator', () => {
  let dummy: Dummy;

  beforeEach(() => {
    dummy = new Dummy();

    jest.resetAllMocks();
  });

  it('should add removeChild method to the decorated class', () => {
    expect(dummy.removeChild).toBeInstanceOf(Function);
  });

  it('should add append method to the decorated class', () => {
    expect(dummy.append).toBeInstanceOf(Function);
  });

  it('should add insertAfter method to the decorated class', () => {
    expect(dummy.insertAfter).toBeInstanceOf(Function);
  });


  describe('constructor', () => {
    it('should append passed children to new parent', () => {
      const childMock = createChildNodeMock();

      dummy = new Dummy({
        children: [ childMock ],
      });

      expect(childMock.appendTo).toBeCalledWith(dummy);
    });
  });

  describe('.children', () => {
    it('should return empty array by default', () => {
      expect(dummy.children).toEqual([]);
    });

    it('should return children passed via constructor', () => {
      const childMock = createChildNodeMock();

      dummy = new Dummy({
        children: [ childMock ],
      });

      expect(dummy.children).toEqual([ childMock ]);
    });
  });

  describe('.append()', () => {
    it('should add child to the children array', () => {
      const childMock = createChildNodeMock();

      dummy.append(childMock);

      expect(dummy.children).toContain(childMock);
    });

    it('should add several children to the children array', () => {
      const childMock = createChildNodeMock();
      const anotherChildMock = createChildNodeMock();

      dummy.append(childMock, anotherChildMock);

      expect(dummy.children).toEqual([childMock, anotherChildMock]);
    });

    it('should move a child to the end of children array if it is already there', () => {
      const childMock = createChildNodeMock();
      const anotherChildMock = createChildNodeMock();
      const oneMoreChildMock = createChildNodeMock();


      dummy = new Dummy({
        children: [childMock, anotherChildMock, oneMoreChildMock],
      });

      dummy.append(anotherChildMock);

      expect(dummy.children).toEqual([childMock, oneMoreChildMock, anotherChildMock]);
    });

    it('should preserve already existing children', () => {
      const childMock = createChildNodeMock();
      const anotherChildMock = createChildNodeMock();
      const oneMoreChildMock = createChildNodeMock();

      dummy = new Dummy({
        children: [childMock, anotherChildMock],
      });

      dummy.append(oneMoreChildMock);

      expect(dummy.children).toEqual([childMock, anotherChildMock, oneMoreChildMock]);
    });
  });

  describe('.insertAfter()', () => {
    it('should insert a child after passed target', () => {
      const childMock = createChildNodeMock();
      const anotherChildMock = createChildNodeMock();
      const childMockToInsert = createChildNodeMock();

      dummy = new Dummy({
        children: [childMock, anotherChildMock],
      });

      dummy.insertAfter(childMock, childMockToInsert);

      expect(dummy.children).toEqual([childMock, childMockToInsert, anotherChildMock]);
    });

    it('should insert several children after passed target', () => {
      const childMock = createChildNodeMock();
      const anotherChildMock = createChildNodeMock();
      const childMockToInsert = createChildNodeMock();
      const anotherChildMockToInsert = createChildNodeMock();

      dummy = new Dummy({
        children: [childMock, anotherChildMock],
      });

      dummy.insertAfter(childMock, childMockToInsert, anotherChildMockToInsert);

      expect(dummy.children).toEqual([childMock, childMockToInsert, anotherChildMockToInsert, anotherChildMock]);
    });

    it('should remove existing child and insert it to the new place', () => {
      const childMock = createChildNodeMock();
      const anotherChildMock = createChildNodeMock();
      const oneMoreChildMock = createChildNodeMock();
      const childMockToInsert = createChildNodeMock();

      dummy = new Dummy({
        children: [childMock, anotherChildMock, oneMoreChildMock, childMockToInsert],
      });

      dummy.insertAfter(anotherChildMock, childMockToInsert);

      expect(dummy.children).toEqual([childMock, anotherChildMock, childMockToInsert, oneMoreChildMock]);
    });
  });

  describe('.removeChild()', () => {
    it('should remove child from the children array', () => {
      const childMock = createChildNodeMock();

      dummy = new Dummy({
        children: [ childMock ],
      });

      dummy.removeChild(childMock);

      expect(dummy.children).toHaveLength(0);
    });

    it('should call remove method of child', () => {
      const childMock = createChildNodeMock();

      dummy = new Dummy({
        children: [ childMock ],
      });

      dummy.removeChild(childMock);

      expect(childMock.remove).toBeCalled();
    });
  });
});
