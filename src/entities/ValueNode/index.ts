import type { ValueNodeConstructorParameters } from './types';

/**
 * ValueNode class represents a node in a tree-like structure, used to store and manipulate data associated with a BlockNode.
 * Unlike TextNode, changing the data of a ValueNode will replace the entire data in this node.
 * This can be useful for storing data that needs to be updated in its entirety, such as a link or other metadata associated with a BlockNode.
 */
export class ValueNode {
  /**
   * Private field representing the data associated with this node
   */
  #value: unknown;

  /**
   * Constructor for ValueNode class.
   *
   * @param args - ValueNode constructor arguments.
   * @param args.value - The value of this value node.
   */
  constructor({ value }: ValueNodeConstructorParameters) {
    this.#value = value;
  }

  /**
   * Updates the data associated with this value node.
   *
   * @param value - The new value of this value node.
   */
  public update(value: unknown): void {
    this.#value = value;
  }

  /**
   * Returns serialized data associated with this value node.
   */
  public get serialized(): unknown {
    return this.#value;
  }
}
