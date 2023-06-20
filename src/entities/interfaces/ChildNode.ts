import { Node } from './Node';
import type { ParentNode } from './ParentNode';

export interface ChildNode {

  appendTo(parent: ParentNode): void;

  remove(): void;

  parent: ParentNode | null;
}

export interface ChildNodeConstructorOptions {
  parent?: ParentNode;
}

/**
 * ChildNode decorator to mixin ChildNode's methods
 *
 * @param constructor - class to decorate
 * @example
 *
 * // interface is required to let TS know about ChildNode's methods
 * interface MyNode extends ChildNode {}
 *
 * @ChildNode
 * class MyNode {}
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- any type here is a TS requirement for mixin classes
export function ChildNode<C extends { new(...args: any[]): Node }>(constructor: C): C {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  return class ChildNode extends constructor {
    /**
     * Node's parent
     *
     * @private
     */
    #parent: ParentNode | null;

    /**
     * @param args — constructor arguments
     * @param {ParentNode} [args.parent] - optional node's parent
     */
    // Stryker disable next-line BlockStatement -- Styker's bug, see https://github.com/stryker-mutator/stryker-js/issues/2474
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any type here is a TS requirement for mixin classes
    constructor(...args: any[]) {
      const { parent, ...rest } = args[0] ?? {};

      super(rest);

      this.#parent = parent ?? null;

      this.parent?.append(this);
    }


    /**
     * Returns node's parent
     */
    public get parent(): ParentNode | null {
      return this.#parent;
    }

    /**
     * Appends this node to passed parent node
     *
     * @param parent - new parent
     */
    public appendTo(parent: ParentNode): void {
      if (this.parent === parent) {
        return;
      }

      this.parent?.removeChild(this);

      this.#parent = parent;

      parent.append(this);
    }

    /**
     * Removes this node from parent
     */
    public remove(): void {
      const parent = this.parent;

      this.#parent = null;

      parent?.removeChild(this);
    }
  };
}
