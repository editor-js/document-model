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

/**
 * BlockNode class represents a node in a tree-like structure used to store and manipulate Blocks in an editor document.
 * A BlockNode can contain one or more child nodes of type TextInlineNode, ValueNode or FormattingInlineNode.
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
   * @param args - BlockNode constructor arguments.
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
           * Value is an array if the BlockNode contains TextInlineNodes and FormattingInlineNodes
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
}

export {
  BlockNodeName,
  createBlockNodeName,
  DataKey,
  createDataKey
};
