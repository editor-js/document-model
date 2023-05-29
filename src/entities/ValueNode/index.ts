import { BlockNode } from '../BlockNode';
import { ValueNodeConstructorParameters, ValueNodeData } from './types';

/**
 * ValueNode class represents a node in a tree-like structure, used to store and manipulate data associated with a BlockNode.
 * Unlike TextNode, changing the data of a ValueNode will replace the entire data in this node.
 * This can be useful for storing data that needs to be updated in its entirety, such as a link or other metadata associated with a BlockNode.
 */
export class ValueNode {
  /**
   * Private field representing the data associated with this node
   */
  #data: ValueNodeData;

  /**
   * Private field representing the parent BlockNode of this node
   */
  #parent: BlockNode;

  /**
   * Constructor for ValueNode class.
   *
   * @param args - ValueNode constructor arguments.
   * @param args.data - The data associated with this node.
   * @param args.parent - The parent BlockNode of this node.
   */
  constructor({ data, parent }: ValueNodeConstructorParameters) {
    this.#data = data;
    this.#parent = parent;
  }

  /**
   * Updates the data associated with this value node.
   *
   * @param key - The key of the data to update.
   * @param value - The value to update the data with.
   */
  public update(key: string, value: unknown): void {
    this.#data[key] = value;
  }

  /**
   * Returns serialized data associated with this value node.
   */
  public get serialized(): ValueNodeData {
    return this.#data;
  }

  /**
   * Returns the parent BlockNode of this value node.
   */
  public get parent(): BlockNode {
    return this.#parent;
  }
}
