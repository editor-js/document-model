import type { ValueNodeConstructorParameters, ValueSerialized } from './types';
import { BlockChildType } from '../BlockNode/types/index.js';
import { NODE_TYPE_HIDDEN_PROP } from '../BlockNode/consts.js';
import { EventBus } from '../../EventBus/EventBus.js';
import { ValueModifiedEvent } from '../../EventBus/events/ValueModifiedEvent.js';

/**
 * ValueNode class represents a node in a tree-like structure, used to store and manipulate data associated with a BlockNode.
 * Unlike TextInlineNode, changing the data of a ValueNode will replace the entire data in this node.
 * This can be useful for storing data that needs to be updated in its entirety, such as a link or other metadata associated with a BlockNode.
 */
export class ValueNode<ValueType = unknown> extends EventBus {
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
    super();

    this.#value = value;
  }

  /**
   * Updates the data associated with this value node.
   *
   * @param value - The new value of this value node.
   */
  public update(value: ValueType): void {
    const previousValue = this.#value;

    this.#value = value;

    this.dispatchEvent(
      new ValueModifiedEvent([], {
        value: this.#value,
        previous: previousValue,
      })
    );
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

  /**
   * Returns the data associated with this value node.
   */
  public get value(): Readonly<ValueType> {
    return this.#value;
  }
}

export type {
  ValueNodeConstructorParameters
};
