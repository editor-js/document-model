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
import { InlineToolData, InlineToolName, RootInlineNode } from '../inline-fragments';

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
    this.#validateKey(dataKey, ValueNode);

    const node = this.#data[dataKey] as ValueNode<T>;

    node.update(value);
  }

  /**
   * Inserts text to the specified text node by index, by default appends text to the end of the current value
   *
   * @param dataKey - key of the data
   * @param text - text to insert
   * @param [start] - char index where to insert text
   */
  public insertText(dataKey: DataKey, text: string, start?: number): void {
    this.#validateKey(dataKey, RootInlineNode);

    const node = this.#data[dataKey] as RootInlineNode;

    node.insertText(text, start);
  }

  /**
   * Removes text from specified text node
   *
   * @param dataKey - key of the data
   * @param [start] - start char index of the range
   * @param [end] - end char index of the range
   */
  public removeText(dataKey: DataKey, start?: number, end?: number): string {
    this.#validateKey(dataKey, RootInlineNode);

    const node = this.#data[dataKey] as RootInlineNode;

    return node.removeText(start, end);
  }

  /**
   * Formats text in the specified text node
   *
   * @param dataKey - key of the data
   * @param tool - name of the Inline Tool to apply
   * @param start - start char index of the range
   * @param end - end char index of the range
   * @param [data] - Inline Tool data if applicable
   */
  public format(dataKey: DataKey, tool: InlineToolName, start: number, end: number, data?: InlineToolData): void {
    this.#validateKey(dataKey, RootInlineNode);

    const node = this.#data[dataKey] as RootInlineNode;

    node.format(tool, start, end, data);
  }

  /**
   * Removes formatting from the specified text node
   *
   * @param key - key of the data
   * @param tool - name of the Inline Tool to remove
   * @param start - start char index of the range
   * @param end - end char index of the range
   */
  public unformat(key: DataKey, tool: InlineToolName, start: number, end: number): void {
    this.#validateKey(key, RootInlineNode);

    const node = this.#data[key] as RootInlineNode;

    node.unformat(tool, start, end);
  }

  /**
   * Validates data key and node type
   *
   * @param key - key to validate
   * @param [Node] - node type to check
   * @private
   */
  #validateKey(key: DataKey, Node?: typeof ValueNode | typeof RootInlineNode): void {
    if (this.#data[key] === undefined) {
      throw new Error(`BlockNode: data with key ${key} does not exist`);
    }

    if (Node && !(this.#data[key] instanceof Node)) {
      throw new Error(`BlockNode: data with key ${key} is not a ${Node.name}`);
    }
  }
}

export {
  BlockNodeName,
  createBlockNodeName,
  DataKey,
  createDataKey
};
