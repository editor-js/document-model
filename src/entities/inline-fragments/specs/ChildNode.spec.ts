import { ChildNode } from '../mixins/ChildNode';
import { ParentNode } from '../mixins/ParentNode';

jest.mock('../mixins/ParentNode');

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

interface ParentDummy extends ParentNode {}

/**
 * ParentNode class dummy
 */
@ParentNode
class ParentDummy {}

describe('ChildNode mixin', () => {
  let dummy: Dummy;
  let parentMock: ParentNode;

  beforeEach(() => {
    parentMock = new ParentDummy();

    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });


  it('should decorated class to a parent', () => {
    const spy = jest.spyOn(parentMock, 'append');

    dummy = new Dummy({ parent: parentMock });

    expect(spy).toBeCalledWith(dummy);
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
      const spy = jest.spyOn(parentMock, 'removeChild');

      dummy.remove();

      expect(spy).toBeCalledWith(dummy);
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
      const spy = jest.spyOn(parentMock, 'append');

      dummy.appendTo(parentMock);

      expect(spy).toBeCalledWith(dummy);
    });

    it('should set node\'s parent on appendTo call', () => {
      dummy.appendTo(parentMock);

      expect(dummy.parent).toBe(parentMock);
    });

    it('should do nothing if parents are the same', () => {
      const dummyWithParent = new Dummy({
        parent: parentMock,
      });

      const spy = jest.spyOn(parentMock, 'append');

      dummyWithParent.appendTo(parentMock);

      expect(spy).not.toBeCalled();
    });
  });
});
