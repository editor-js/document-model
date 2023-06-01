import { Node } from './Node';
import type { ParentNode } from './ParentNode';

export interface ChildNode {

  appendTo(parent: ParentNode): void;

  remove(): void;
}

/**
 *
 * @param constructor
 */
export function ChildNode<C extends { new(...args: any[]): Node }>(constructor: C): C {
  return class extends constructor {
    #parent?: ParentNode;

    /**
     *
     * @param {...any} args
     */
    constructor(...args: any[]) {
      const { parent, ...rest } = args[0] ?? {};

      super(rest);

      this.#parent = parent;
    }

    /**
     *
     * @param parent
     */
    public appendTo(parent: ParentNode): void {
      this.#parent = parent;

      parent.appendChild(this);
    }

    /**
     *
     */
    public remove(): void {
      this.#parent?.removeChild(this);
    }
  };
}
