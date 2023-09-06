console.log('Change file to test CI');

import { EditorDocument } from '../EditorDocument';
import { BlockTune, BlockTuneName } from '../BlockTune';
import {
  BlockNodeConstructorParameters,
  BlockNodeName,
  createBlockNodeName,
  DataKey,
  createDataKey, BlockNodeData,
  BlockNodeSerialized
} from './types';
import { ValueNode } from '../ValueNode';

/**
 * BlockNode class represents a node in a tree-like structure used to store and manipulate Blocks in an editor document.
 * A BlockNode can contain one or more child nodes of type RootInlineNode or ValueNode.
 * It can also be associated with one or more BlockTunes, which can modify the behavior of the BlockNode.
 */
export class BlockNode {
  /**
   * Field representing a name of the Tool created this Block
   */
  #name: BlockNodeName;

  /**
   * Field representing the content of the Block
   */
  #data: BlockNodeData;

  /**
   * Field representing the parent EditorDocument of the BlockNode
   */
  #parent: EditorDocument | null;

  /**
   * Private field representing the BlockTunes associated with the BlockNode
   */
  #tunes: Record<BlockTuneName, BlockTune>;

  /**
   * Constructor for BlockNode class.
   *
   * @param args - BlockNode constructor arguments.
   * @param args.name - The name of the BlockNode.
   * @param [args.data] - The content of the BlockNode.
   * @param [args.parent] - The parent EditorDocument of the BlockNode.
   * @param [args.tunes] - The BlockTunes associated with the BlockNode.
   */
  constructor({ name, data = {}, parent, tunes = {} }: BlockNodeConstructorParameters) {
    this.#name = name;
    this.#data = data;
    this.#parent = parent ?? null;
    this.#tunes = tunes;
  }

  /**
   * Getter to access BlockNode parent
   */
  public get parent(): EditorDocument | null {
    return this.#parent;
  }

  /**
   * Returns serialized object representing the BlockNode
   */
  public get serialized(): BlockNodeSerialized {
    const serializedData = Object.fromEntries(
      Object
        .entries(this.#data)
        .map(([dataKey, value]) => ([dataKey, value.serialized]))
    );

    const serializedTunes = Object.fromEntries(
      Object
        .entries(this.#tunes)
        .map(
          ([name, tune]) => ([name, tune.serialized])
        )
    );

    return {
      name: this.#name,
      data: serializedData,
      tunes: serializedTunes,
    };
  }

  /**
   * Updates data in the BlockTune by the BlockTuneName
   *
   * @param tuneName - The name of the BlockTune
   * @param data - The data to update the BlockTune with
   */
  public updateTuneData(tuneName: BlockTuneName, data: Record<string, unknown>): void {
    Object.entries(data).forEach(([key, value]) => {
      this.#tunes[tuneName].update(key, value);
    });
  }

  /**
   * Updates the ValueNode data associated with this BlockNode
   *
   * @param dataKey - The key of the ValueNode to update
   * @param value - The new value of the ValueNode
   */
  public updateValue<T = unknown>(dataKey: DataKey, value: T): void {
    const data = this.#data[dataKey];

    if (data === undefined) {
      throw new Error(`BlockNode: data with key ${dataKey} does not exist`);
    }

    if (!(data instanceof ValueNode)) {
      throw new Error(`BlockNode: data with key ${dataKey} is not a ValueNode`);
    }

    data.update(value);
  }
}

export {
  BlockNodeName,
  createBlockNodeName,
  DataKey,
  createDataKey
};
