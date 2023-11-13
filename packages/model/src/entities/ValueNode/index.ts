import type { ValueNodeConstructorParameters, ValueSerialized } from './types';
import { BlockChildType } from '../BlockNode/types/index.js';
import { NODE_TYPE_HIDDEN_PROP } from '../BlockNode/consts.js';

/**
 * ValueNode class represents a node in a tree-like structure, used to store and manipulate data associated with a BlockNode.
 * Unlike TextInlineNode, changing the data of a ValueNode will replace the entire data in this node.
 * This can be useful for storing data that needs to be updated in its entirety, such as a link or other metadata associated with a BlockNode.
 */
export class ValueNode<ValueType = unknown> {
  /**
   * Private field representing the data associated with this node
   */
  #value: ValueType;

  /**
   * Constructor for ValueNode class.
   *
   * @param args - ValueNode constructor arguments.
   * @param args.value - The value of this value node.
   */
  constructor({ value }: ValueNodeConstructorParameters<ValueType>) {
    this.#value = value;
  }

  /**
   * Updates the data associated with this value node.
   *
   * @param value - The new value of this value node.
   */
  public update(value: ValueType): void {
    this.#value = value;
  }

  /**
   * Returns serialized data associated with this value node.
   */
  public get serialized(): ValueSerialized<ValueType> {
    let value = this.#value;

    if (typeof value === 'object' && this.#value !== null) {
      value = Object.assign({ [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Value }, value);
    }

    return value as ValueSerialized<ValueType>;
  }
}

export type {
  ValueNodeConstructorParameters
};
