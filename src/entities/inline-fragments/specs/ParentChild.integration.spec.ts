import { beforeEach, describe } from '@jest/globals';
import { ParentNode } from '../mixins/ParentNode';
import { ChildNode } from '../mixins/ChildNode';

interface DummyParent extends ParentNode {}

/**
 *
 */
@ParentNode
class DummyParent {
  /**
   *
   * @param _options - dummy options
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function,@typescript-eslint/no-unused-vars,no-unused-vars
  constructor(_options?: unknown) {}
}

interface DummyChild extends ChildNode {}

/**
 *
 */
@ChildNode
class DummyChild {
  /**
   *
   * @param _options - dummy options
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function,@typescript-eslint/no-unused-vars,no-unused-vars
  constructor(_options?: unknown) {}
}

describe('ParentNode and ChildNode integration', () => {
  describe('child removal', () => {
    let parent: DummyParent;
    let child: DummyChild;

    beforeEach(() => {
      parent = new DummyParent();
      child = new DummyChild({ parent });
    });

    it('should remove child from parent on child.remove() call', () => {
      child.remove();

      expect(parent.children).not.toContain(child);
    });

    it('should set child\'s parent to null on parent.removeChild() call', () => {
      parent.removeChild(child);

      expect(child.parent).toBeNull();
    });
  });

  describe('child addition', () => {
    let parent: DummyParent;
    let child: DummyChild;

    beforeEach(() => {
      parent = new DummyParent();
      child = new DummyChild();
    });

    it('should add child to parent on child.appendTo call', () => {
      child.appendTo(parent);

      expect(parent.children).toContain(child);
    });

    it('should set child\'s parent on parent.append() call', () => {
      parent.append(child);

      expect(child.parent).toEqual(parent);
    });


    it('should set child\'s parent on parent.insertAfter() call', () => {
      const anotherChild = new DummyChild();

      parent.append(child);

      parent.insertAfter(child, anotherChild);

      expect(anotherChild.parent).toEqual(parent);
    });
  });

  describe('child transfer from parent to parent', () => {
    let parent: DummyParent;
    let anotherParent: DummyParent;
    let child: DummyChild;

    beforeEach(() => {
      parent = new DummyParent();
      child = new DummyChild({ parent });

      anotherParent = new DummyParent();
    });

    it('should remove child from the old parent on new parent.append() call', () => {
      anotherParent.append(child);

      expect(parent.children).not.toContain(child);
    });

    it('should remove child from the old parent on new parent.insertAfter() call', () => {
      const anotherChild = new DummyChild({ parent: anotherParent });

      anotherParent.insertAfter(anotherChild, child);

      expect(parent.children).not.toContain(child);
    });
  });
});
