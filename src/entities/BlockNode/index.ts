import { EditorDocument } from '../EditorDocument';
import { BlockTune, BlockTuneName, BlockTuneSerialized } from '../BlockTune';
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
 * A BlockNode can contain one or more child nodes of type TextNode, ValueNode or FormattingNode.
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
  #parent: EditorDocument;

  /**
   * Private field representing the BlockTunes associated with the BlockNode
   */
  #tunes: Record<BlockTuneName, BlockTune>;

  /**
   * Constructor for BlockNode class.
   *
   * @param args - TextNode constructor arguments.
   * @param args.name - The name of the BlockNode.
   * @param args.data - The content of the BlockNode.
   * @param args.parent - The parent EditorDocument of the BlockNode.
   * @param args.tunes - The BlockTunes associated with the BlockNode.
   */
  constructor({ name, data, parent, tunes = {} }: BlockNodeConstructorParameters) {
    this.#name = name;
    this.#data = data;
    this.#parent = parent;
    this.#tunes = tunes;
  }

  /**
   * Returns serialized object representing the BlockNode
   */
  public get serialized(): BlockNodeSerialized {
    const serializedData = Object
      .entries(this.#data)
      .reduce(
        (acc, [dataKey, value]) => {
          /**
           * If the value is an array, we need to serialize each node in the array
           * Value is an array if the BlockNode contains TextNodes and FormattingNodes
           * After serializing there will be InlineNodeSerialized object
           */
          if (value instanceof Array) {
            acc[dataKey] = value.map((node) => node.serialized);

            return acc;
          }

          acc[dataKey] = value.serialized;

          return acc;
        },
        {} as Record<string, unknown>
      );

    const serializedTunes = Object
      .entries(this.#tunes)
      .reduce(
        (acc, [name, tune]) => {
          acc[name] = tune.serialized;

          return acc;
        },
        {} as Record<string, BlockTuneSerialized>
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
  public updateValue(dataKey: DataKey, value: unknown): void {
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
