import { Node } from './Node';
import type { ChildNode } from './ChildNode';

export interface ParentNode {
  append(...children: ChildNode[]): void;

  removeChild(child: ChildNode): void;
}

/**
 *
 * @param constructor
 */
export function ParentNode<C extends { new(...args: any[]): Node }>(constructor: C): C {
  return class extends constructor {
    #children: ChildNode[];

    /**
     *
     * @param {...any} args
     */
    constructor(...args: any[]) {
      const { children = [], ...rest } = args[0];

      super(rest);

      this.#children = children;
    }

    /**
     *
     * @param child
     * @param {...any} children
     */
    public append(...children: ChildNode[]): void {
      this.#children.push(...children);

      children.forEach(child => child.appendTo(this));
    }

    /**
     *
     * @param child
     */
    public removeChild(child: ChildNode): void {
      const index = this.#children.indexOf(child);

      this.#children.splice(index, 1);
    }
  };
}
