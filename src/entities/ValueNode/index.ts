import { BlockNode } from '../BlockNode';
import type { ValueNodeConstructorParameters, ValueNodeName, ValueNodeSerialized } from './types';

/**
 * ValueNode class represents a node in a tree-like structure, used to store and manipulate data associated with a BlockNode.
 * Unlike TextNode, changing the data of a ValueNode will replace the entire data in this node.
 * This can be useful for storing data that needs to be updated in its entirety, such as a link or other metadata associated with a BlockNode.
 */
export class ValueNode {
  /**
   * Private field representing the name of this value node.
   */
  #name: ValueNodeName;

  /**
   * Private field representing the data associated with this node
   */
  #value: unknown;

  /**
   * Private field representing the parent BlockNode of this node
   */
  #parent: BlockNode;

  /**
   * Constructor for ValueNode class.
   *
   * @param args - ValueNode constructor arguments.
   * @param args.name - The name of this value node.
   * @param args.value - The value of this value node.
   * @param args.parent - The parent BlockNode of this node.
   */
  constructor({ name, value, parent }: ValueNodeConstructorParameters) {
    this.#name = name;
    this.#value = value;
    this.#parent = parent;
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
  public get serialized(): ValueNodeSerialized {
    return {
      name: this.#name,
      value: this.#value,
    };
  }

  /**
   * Returns the parent BlockNode of this value node.
   */
  public get parent(): BlockNode {
    return this.#parent;
  }
}

export {
  ValueNodeName,
  createValueNodeName
} from './types';
