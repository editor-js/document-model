import type { ChildNode } from '../ChildNode';
import type { InlineNode } from '../../InlineNode';

/**
 * Abstract parent node interface
 */
export interface ParentNode extends InlineNode {
  /**
   * Node's children
   */
  readonly children: ChildNode[];

  /**
   * Appends passed children to this node
   *
   * @param children - array of children to append
   */
  append(...children: ChildNode[]): void;

  /**
   * Removes a child from the parent
   *
   * @param child - child to remove
   */
  removeChild(child: ChildNode): void;

  /**
   * Inserts new children after specified target
   *
   * @param target - target after which to insert new children
   * @param children - children nodes to insert
   */
  insertAfter(target: ChildNode, ...children: ChildNode[]): void

  /**
   * Normalizes node's children
   */
  normalize(): void;
}

export interface ParentNodeConstructorOptions {
  children?: ChildNode[];
}

/**
 * ParentNode decorator to mixin ParentNode's methods
 *
 * @param constructor - class to decorate
 * @example
 *
 * ```ts
 * // interface is required to let TS know about ParentNode's methods
 * interface MyNode extends ParentNode {}
 *
 * @ParentNode
 * class MyNode {}
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- any type here is a TS requirement for mixin classes
export function ParentNode<C extends { new(...args: any[]): InlineNode }>(constructor: C): C {
  return class extends constructor {
    #children: ChildNode[] = [];

    /**
     * @param args — constructor arguments
     * @param {ChildNode[]} [args.children] - optional node's children
     */
    // Stryker disable next-line BlockStatement -- Styker's bug, see https://github.com/stryker-mutator/stryker-js/issues/2474
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any type here is a TS requirement for mixin classes
    constructor(...args: any[]) {
      const { children = [], ...rest } = args[0] as ParentNodeConstructorOptions ?? {};

      super(rest);

      children.forEach(child => child.appendTo(this));
    }

    /**
     * Returns node's children
     */
    public get children(): ChildNode[] {
      return this.#children;
    }

    /**
     * Returns text value length of current node (including subtree)
     */
    public get length(): number {
      return this.children.reduce((sum, child) => sum + child.length, 0);
    }

    /**
     * Appends passed children to this node
     *
     * @param children - array of children to append
     */
    public append(...children: ChildNode[]): void {
      /**
       * If node is already a child of current node, remove it to append at the end
       */
      children.forEach(child => {
        const index = this.children.indexOf(child);

        if (index === -1) {
          return;
        }

        this.children.splice(index, 1);
      });

      this.children.push(...children);

      children.forEach(child => child.appendTo(this));
    }

    /**
     * Removes a child from the parent
     *
     * @param child - child to remove
     */
    public removeChild(child: ChildNode): void {
      const index = this.children.indexOf(child);

      if (index === -1) {
        return;
      }

      this.children.splice(index, 1);

      child.remove();
    }

    /**
     * Inserts new children after specified target
     *
     * @param target - target after which to insert new children
     * @param children - children nodes to insert
     */
    public insertAfter(target: ChildNode, ...children: ChildNode[]): void {
      /**
       * We need to get the index first before any manipulations with children array
       */
      const targetIndex = this.children.indexOf(target);

      /**
       * Append children to the parent to set their parent property
       */
      children.forEach(child => child.appendTo(this));

      /**
       * Remove all appended children from the children array to insert if on the next step
       */
      children.forEach(child => {
        const index = this.children.indexOf(child);

        this.children.splice(index, 1);
      });

      /**
       * Insert added children to correct places
       */
      this.children.splice(targetIndex + 1, 0, ...children);
    }


    /**
     * Normalizes node's subtree
     */
    public normalize(): void {
      const children = Array.from(this.children);

      if (children.length === 0) {
        return;
      }

      children.reduce((prev, child) => {
        if (prev !== undefined && prev.isEqual(child)) {
          prev.mergeWith(child);

          return prev;
        }

        return child;
      });

      children.forEach(child => {
        if (child.length === 0) {
          child.remove();
        }
      });

      this.children.forEach(child => child.normalize());
    }
  };
}
