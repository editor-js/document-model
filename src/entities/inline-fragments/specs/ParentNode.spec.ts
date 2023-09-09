import { ParentNode } from '../mixins/ParentNode';
import { ChildNode } from '../mixins/ChildNode';

jest.mock('../mixins/ChildNode');

interface Dummy extends ParentNode {
}

/**
 * ParentNode class dummy
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

interface ChildDummy extends ChildNode {}

/**
 * ChildNode class dummy
 */
@ChildNode
class ChildDummy {}

describe('ParentNode mixin', () => {
  let dummy: Dummy;

  beforeEach(() => {
    dummy = new Dummy();
  });

  afterEach(() => {
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
      const childMock = new ChildDummy();
      const spy = jest.spyOn(childMock, 'appendTo');

      dummy = new Dummy({
        children: [ childMock ],
      });

      expect(spy).toBeCalledWith(dummy);
    });
  });

  describe('.length', () => {
    it('should return sum of children lengths', () => {
      const childMock = new ChildDummy();
      const anotherChildMock = new ChildDummy();

      dummy.append(childMock, anotherChildMock);

      expect(dummy.length).toEqual(childMock.length + anotherChildMock.length);
    });
  });

  describe('.children', () => {
    it('should return empty array by default', () => {
      expect(dummy.children).toEqual([]);
    });

    it('should append children passed via constructor', () => {
      const childMock = new ChildDummy();
      const spy = jest.spyOn(childMock, 'appendTo');

      dummy = new Dummy({
        children: [ childMock ],
      });

      expect(spy).toBeCalledWith(dummy);
    });
  });

  describe('.append()', () => {
    it('should add child to the children array', () => {
      const childMock = new ChildDummy();

      dummy.append(childMock);

      expect(dummy.children).toContain(childMock);
    });

    it('should add several children to the children array', () => {
      const childMock = new ChildDummy();
      const anotherChildMock = new ChildDummy();

      dummy.append(childMock, anotherChildMock);

      expect(dummy.children).toEqual([childMock, anotherChildMock]);
    });

    it('should append a child to the end of children array if it is already there', () => {
      const childMock = new ChildDummy();
      const anotherChildMock = new ChildDummy();
      const oneMoreChildMock = new ChildDummy();

      dummy.append(childMock, anotherChildMock, oneMoreChildMock);

      dummy.append(anotherChildMock);

      expect(dummy.children).toEqual([childMock, oneMoreChildMock, anotherChildMock]);
    });

    it('should preserve already existing children', () => {
      const childMock = new ChildDummy();
      const anotherChildMock = new ChildDummy();
      const oneMoreChildMock = new ChildDummy();

      dummy.append(childMock, anotherChildMock);

      dummy.append(oneMoreChildMock);

      expect(dummy.children).toEqual([childMock, anotherChildMock, oneMoreChildMock]);
    });
  });

  describe('.insertAfter()', () => {
    it('should call child\'s appendTo methods', () => {
      const childMock = new ChildDummy();
      const anotherChildMock = new ChildDummy();
      const childMockToInsert = new ChildDummy();

      const spy = jest.spyOn(childMockToInsert, 'appendTo');

      dummy = new Dummy({
        children: [childMock, anotherChildMock],
      });

      dummy.insertAfter(childMock, childMockToInsert);

      expect(spy).toBeCalledWith(dummy);
    });

    it('should call appendTo for each passed child', () => {
      const childMock = new ChildDummy();
      const anotherChildMock = new ChildDummy();
      const childMockToInsert = new ChildDummy();
      const anotherChildMockToInsert = new ChildDummy();

      const spies = [childMockToInsert, anotherChildMockToInsert].map(child => jest.spyOn(child, 'appendTo'));

      dummy = new Dummy({
        children: [childMock, anotherChildMock],
      });

      dummy.insertAfter(childMock, childMockToInsert, anotherChildMockToInsert);

      spies.forEach(spy => {
        expect(spy).toBeCalledWith(dummy);
      });
    });

    it('should remove existing child and insert it to the new place', () => {
      const childMock = new ChildDummy();
      const anotherChildMock = new ChildDummy();
      const childMockToInsert = new ChildDummy();

      dummy.append(childMock, childMockToInsert, anotherChildMock);

      dummy.insertAfter(anotherChildMock, childMockToInsert);

      expect(dummy.children).toEqual([childMock, anotherChildMock, childMockToInsert]);
    });
  });

  describe('.removeChild()', () => {
    it('should remove child from the children array', () => {
      const childMock = new ChildDummy();

      dummy = new Dummy({
        children: [ childMock ],
      });

      dummy.removeChild(childMock);

      expect(dummy.children).toHaveLength(0);
    });

    it('should call remove method of child', () => {
      const childMock = new ChildDummy();
      const spy = jest.spyOn(childMock, 'remove');

      dummy = new Dummy({
        children: [ childMock ],
      });

      dummy.removeChild(childMock);

      expect(spy).toBeCalled();
    });
  });

  describe('.normalize()', () => {
    it('should call normalize for each child', () => {
      const childMock = new ChildDummy();
      const anotherChildMock = new ChildDummy();

      const spies = [childMock, anotherChildMock].map(child => jest.spyOn(child, 'normalize'));

      dummy.append(childMock, anotherChildMock);

      dummy.normalize();

      spies.forEach(spy => expect(spy).toHaveBeenCalled());
    });

    it('should merge two equal children', () => {
      const childMock = new ChildDummy();
      const anotherChildMock = new ChildDummy();

      jest.spyOn(childMock, 'isEqual').mockImplementation(() => true);

      const spy = jest.spyOn(childMock, 'mergeWith');

      dummy.append(childMock, anotherChildMock);

      dummy.normalize();

      expect(spy).toHaveBeenCalledWith(anotherChildMock);
    });

    it('should merge more than two equal children', () => {
      const childMock = new ChildDummy();
      const anotherChildMock = new ChildDummy();
      const oneMoreChildMock = new ChildDummy();

      jest.spyOn(childMock, 'isEqual').mockImplementation(() => true);

      const spy = jest.spyOn(childMock, 'mergeWith');

      dummy.append(childMock, anotherChildMock, oneMoreChildMock);

      dummy.normalize();

      expect(spy).toHaveBeenCalledWith(oneMoreChildMock);
    });

    it('should remove child if it\'s length is 0', () => {
      const childMock = new ChildDummy();

      jest.replaceProperty(childMock, 'length', 0);

      const spy = jest.spyOn(childMock, 'remove');

      dummy.append(childMock);

      dummy.normalize();

      expect(spy).toHaveBeenCalled();
    });

    it('should not throw an error if there is no children', () => {
      expect(() => dummy.normalize()).not.toThrow();
    });
  });
});
