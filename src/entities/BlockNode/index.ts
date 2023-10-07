import { EditorDocument } from '../EditorDocument';
import { BlockTune, BlockTuneName, createBlockTuneName } from '../BlockTune';
import {
  BlockNodeConstructorParameters,
  BlockToolName,
  createBlockToolName,
  DataKey,
  createDataKey,
  BlockNodeData,
  BlockNodeSerialized,
  BlockNodeDataSerialized,
  BlockNodeDataSerializedValue,
  BlockChildType,
  ChildNode,
  BlockNodeDataValue,
} from './types';
import { ValueNode } from '../ValueNode';
import { InlineToolData, InlineToolName, TextNode, TextNodeSerialized } from '../inline-fragments';

/**
 * BlockNode class represents a node in a tree-like structure used to store and manipulate Blocks in an editor document.
 * A BlockNode can contain one or more child nodes of type TextNode or ValueNode.
 * It can also be associated with one or more BlockTunes, which can modify the behavior of the BlockNode.
 */
export class BlockNode {
  /**
   * Field representing a name of the Tool created this Block
   */
  #name: BlockToolName;

  /**
   * Field representing the content of the Block
   */
  #data: BlockNodeData = {};

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
    this.#name = createBlockToolName(name);
    this.#parent = parent ?? null;
    this.#tunes = Object.fromEntries(
      Object.entries(tunes)
        .map(
          ([tuneName, tuneData]) => ([
            createBlockTuneName(tuneName),
            new BlockTune({
              name: createBlockTuneName(tuneName),
              data: tuneData,
            }),
          ])
        )
    );

    this.#initialize(data);
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
    const map = (data: BlockNodeDataValue): BlockNodeDataSerializedValue => {
      if (Array.isArray(data)) {
        return data.map(map) as BlockNodeDataSerialized[];
      }

      if (data instanceof ValueNode || data instanceof TextNode) {
        return data.serialized;
      }

      return Object.fromEntries(
        Object.entries(data)
          .map(([key, value]) => ([key, map(value)]))
      );
    };

    const serializedData = Object.fromEntries(
      Object
        .entries(this.#data)
        .map(([dataKey, value]) => ([dataKey, map(value)]))
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
    this.#validateKey(dataKey, TextNode);

    const node = this.#data[dataKey] as TextNode;

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
    this.#validateKey(dataKey, TextNode);

    const node = this.#data[dataKey] as TextNode;

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
    this.#validateKey(dataKey, TextNode);

    const node = this.#data[dataKey] as TextNode;

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
    this.#validateKey(key, TextNode);

    const node = this.#data[key] as TextNode;

    node.unformat(tool, start, end);
  }

  /**
   *
   * @param data
   */
  #initialize(data: BlockNodeDataSerialized): void {
    const map = (value: BlockNodeDataSerializedValue): BlockNodeData | BlockNodeDataValue => {
      if (Array.isArray(value)) {
        return value.map(map) as BlockNodeData[] | ChildNode[];
      }

      if (typeof value === 'object' && value !== null) {
        if ('$t' in value) {
          switch (value.$t) {
            case BlockChildType.Value:
              return new ValueNode({ value });
            case BlockChildType.Text:
              return new TextNode(value as TextNodeSerialized);
          }
        }

        return Object.fromEntries(
          Object.entries(value)
            .map(([key, v]) => ([key, map(v)]))
        );
      }

      return new ValueNode({ value });
    };

    this.#data = Object.fromEntries(
      Object.entries(data)
        .map(([key, value]) => ([key, map(value)]))
    );
  }

  /**
   * Validates data key and node type
   *
   * @param key - key to validate
   * @param [Node] - node type to check
   * @private
   */
  #validateKey(key: DataKey, Node?: typeof ValueNode | typeof TextNode): void {
    if (this.#data[key] === undefined) {
      throw new Error(`BlockNode: data with key ${key} does not exist`);
    }

    if (Node && !(this.#data[key] instanceof Node)) {
      throw new Error(`BlockNode: data with key ${key} is not a ${Node.name}`);
    }
  }
}

export {
  BlockToolName,
  createBlockToolName,
  DataKey,
  createDataKey
};
