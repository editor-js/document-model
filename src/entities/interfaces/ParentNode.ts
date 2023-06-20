import { Node } from './Node';
import type { ChildNode } from './ChildNode';

export interface ParentNode {
  append(...children: ChildNode[]): void;

  removeChild(child: ChildNode): void;

  insertAfter(target: ChildNode, ...children: ChildNode[]): void

  children: ChildNode[];
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
export function ParentNode<C extends { new(...args: any[]): Node }>(constructor: C): C {
  return class extends constructor {
    #children: ChildNode[];

    /**
     * @param args — constructor arguments
     * @param {ChildNode[]} [args.children] - optional node's children
     */
    // Stryker disable next-line BlockStatement -- Styker's bug, see https://github.com/stryker-mutator/stryker-js/issues/2474
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any type here is a TS requirement for mixin classes
    constructor(...args: any[]) {
      const { children = [], ...rest } = args[0] ?? {};

      super(rest);

      this.#children = children;

      this.children.forEach(child => child.appendTo(this));
    }

    /**
     * Returns node's children
     */
    public get children(): ChildNode[] {
      return this.#children;
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
       * If node is already a child of current node, remove it to append at the end
       */
      children.forEach(child => {
        const index = this.children.indexOf(child);

        if (index === -1) {
          return;
        }

        this.children.splice(index, 1);
      });

      const index = this.children.indexOf(target);

      this.children.splice(index + 1, 0, ...children);

      children.forEach(child => child.appendTo(this));
    }
  };
}
