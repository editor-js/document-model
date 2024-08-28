import type { EditorDocument } from '../EditorDocument';
import type { BlockTuneName, BlockTuneSerialized } from '../BlockTune';
import { BlockTune, createBlockTuneName } from '../BlockTune/index.js';
import { IndexBuilder } from '../Index/IndexBuilder.js';
import type {
  BlockNodeConstructorParameters,
  BlockNodeData,
  BlockNodeDataSerialized,
  BlockNodeDataSerializedValue,
  BlockNodeDataValue,
  BlockNodeSerialized,
  BlockToolName,
  ChildNode,
  DataKey
} from './types';
import { BlockChildType, createBlockToolName, createDataKey } from './types/index.js';
import { ValueNode } from '../ValueNode/index.js';
import type { InlineFragment, InlineToolData, InlineToolName, TextNodeSerialized } from '../inline-fragments';
import { TextNode } from '../inline-fragments/index.js';
import { get, has } from '../../utils/keypath.js';
import { NODE_TYPE_HIDDEN_PROP } from './consts.js';
import { mapObject } from '../../utils/mapObject.js';
import type { DeepReadonly } from '../../utils/DeepReadonly';
import { EventBus } from '../../EventBus/EventBus.js';
import { EventType } from '../../EventBus/types/EventType.js';
import {
  TuneModifiedEvent,
  ValueModifiedEvent
} from '../../EventBus/events/index.js';
import type { Constructor } from '../../utils/types.js';
import type { TextNodeEvents } from '../../EventBus/types/EventMap';
import { BaseDocumentEvent } from '../../EventBus/events/BaseEvent.js';

/**
 * BlockNode class represents a node in a tree-like structure used to store and manipulate Blocks in an editor document.
 * A BlockNode can contain one or more child nodes of type TextNode or ValueNode.
 * It can also be associated with one or more BlockTunes, which can modify the behavior of the BlockNode.
 */
export class BlockNode extends EventBus {
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
  constructor({
    name,
    data = {},
    parent,
    tunes = {},
  }: BlockNodeConstructorParameters) {
    super();

    this.#name = createBlockToolName(name);
    this.#parent = parent ?? null;
    this.#tunes = mapObject(
      tunes,
      (tuneData: BlockTuneSerialized, tuneName: string) => {
        const tune = new BlockTune({
          name: createBlockTuneName(tuneName),
          data: tuneData,
        });

        this.#listenAndBubbleTuneEvent(tune, tuneName as BlockTuneName);

        return tune;
      }
    );

    this.#initialize(data);
  }

  /**
   * Allows accessing Block name
   */
  public get name(): string {
    return this.#name;
  }

  /**
   * Allows accessing Block data
   */
  public get data(): DeepReadonly<BlockNodeData> {
    return this.#data;
  }

  /**
   * Getter to access BlockNode parent
   */
  public get parent(): EditorDocument | null {
    return this.#parent;
  }

  /**
   * Getter to access BlockNode data
   */
  public get tunes(): Readonly<Record<string, BlockTune>> {
    return this.#tunes;
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

      return mapObject(data, map);
    };

    const serializedData = mapObject(this.#data, map);

    const serializedTunes = mapObject(
      this.#tunes,
      (tune) => tune.serialized
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
    Object.entries(data)
      .forEach(([key, value]) => {
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

    const node = get(this.#data, dataKey as string) as ValueNode<T>;

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

    const node = get(this.#data, dataKey as string) as TextNode;

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

    const node = get(this.#data, dataKey as string) as TextNode;

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

    const node = get(this.#data, dataKey as string) as TextNode;

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

    const node = get(this.#data, key as string) as TextNode;

    node.unformat(tool, start, end);
  }

  /**
   * Returns all fragments of the text node by range
   * If the name of the Inline Tool is passed, then only fragments of this Inline Tool will be returned
   *
   * @param dataKey - key of the data
   * @param [start] - start char index of the range
   * @param [end] - end char index of the range
   * @param [tool] - name of the Inline Tool
   * @throws {Error} if data with passed key does not exist
   */
  public getFragments(dataKey: DataKey, start?: number, end?: number, tool?: InlineToolName): InlineFragment[] {
    this.#validateKey(dataKey, TextNode);

    const node = get<TextNode>(this.#data, dataKey as string)!;

    return node.getFragments(start, end, tool);
  }

  /**
   * Initializes BlockNode with passed block data
   *
   * @param data - block data
   */
  #initialize(data: BlockNodeDataSerialized): void {
    /**
     * Recursively maps serialized data to BlockNodeData
     *
     * 1. If value is an object with NODE_TYPE_HIDDEN_PROP, then it's a serialized node.
     *  a. If NODE_TYPE_HIDDEN_PROP is BlockChildType.Value, then it's a serialized ValueNode
     *  b. If NODE_TYPE_HIDDEN_PROP is BlockChildType.Text, then it's a serialized TextNode
     * 2. If value is an array, then it's an array of serialized nodes, so map it recursively
     * 3. If value is an object without NODE_TYPE_HIDDEN_PROP, then it's a JSON object, so map it recursively
     * 4. Otherwise, it's a primitive value, so create a ValueNode with it
     *
     * @param value - serialized value
     * @param key - keypath of the current value
     */
    const mapSerializedToNodes = (value: BlockNodeDataSerializedValue, key: string): BlockNodeData | BlockNodeDataValue => {
      if (Array.isArray(value)) {
        return value.map((v, i) => mapSerializedToNodes(v, `${key}.${i}`)) as BlockNodeData[] | ChildNode[];
      }

      if (typeof value === 'object' && value !== null) {
        if (NODE_TYPE_HIDDEN_PROP in value) {
          switch (value[NODE_TYPE_HIDDEN_PROP]) {
            case BlockChildType.Value: {
              const node = new ValueNode({ value });

              this.#listenAndBubbleValueNodeEvent(node, key as DataKey);

              return node;
            }
            case BlockChildType.Text: {
              const node = new TextNode(value as TextNodeSerialized);

              this.#listenAndBubbleTextNodeEvent(node, key as DataKey);

              return node;
            }
          }
        }

        return mapObject(value as BlockNodeDataSerialized, (v, k) => mapSerializedToNodes(v, `${key}.${k}`));
      }

      const node = new ValueNode({ value });

      this.#listenAndBubbleValueNodeEvent(node, key as DataKey);

      return node;
    };

    this.#data = mapObject(data, mapSerializedToNodes);
  }

  /**
   * Validates data key and node type
   *
   * @param key - key to validate
   * @param [Node] - node type to check
   * @private
   */
  #validateKey(key: DataKey, Node?: typeof ValueNode | typeof TextNode): void {
    if (!has(this.#data, key as string)) {
      throw new Error(`BlockNode: data with key "${key}" does not exist`);
    }

    if (Node && !(get(this.#data, key as string) instanceof Node)) {
      throw new Error(`BlockNode: data with key "${key}" is not a ${Node.name}`);
    }
  }

  /**
   * Listens to TextNode events and bubbles them to the BlockNode
   *
   * @param node - TextNode to listen to
   * @param key - TextNode key in the BlockNode data
   */
  #listenAndBubbleTextNodeEvent(node: TextNode, key: DataKey): void {
    node.addEventListener(
      EventType.Changed,
      (event: Event): void => {
        if (!(event instanceof BaseDocumentEvent)) {
          // Stryker disable next-line StringLiteral
          console.error('BlockNode: TextNode should only emit BaseDocumentEvent');

          return;
        }

        const builder = new IndexBuilder();

        builder.from(event.detail.index).addDataKey(key);

        this.dispatchEvent(
          new (event.constructor as Constructor<TextNodeEvents>)(
            builder.build(),
            event.detail.data
          )
        );
      }
    );
  }

  /**
   * Listens to ValueNode events and bubbles them to the BlockNode
   *
   * @param node - ValueNode to listen to
   * @param key - ValueNode key in the BlockNode data
   */
  #listenAndBubbleValueNodeEvent(node: ValueNode, key: DataKey): void {
    node.addEventListener(
      EventType.Changed,
      (event: Event): void => {
        if (!(event instanceof BaseDocumentEvent)) {
          // Stryker disable next-line StringLiteral
          console.error('BlockNode: ValueNode should only emit BaseDocumentEvent');

          return;
        }

        const builder = new IndexBuilder();

        builder.addDataKey(key);

        this.dispatchEvent(
          new ValueModifiedEvent(
            builder.build(),
            event.detail.data
          )
        );
      }
    );
  }

  /**
   * Listens to BlockTune events and bubbles them to the BlockNode
   *
   * @param tune - BlockTune to listen to
   * @param name - BlockTune name in the BlockNode data
   */
  #listenAndBubbleTuneEvent(tune: BlockTune, name: BlockTuneName): void {
    tune.addEventListener(
      EventType.Changed,
      (event: Event): void => {
        if (!(event instanceof BaseDocumentEvent)) {
          // Stryker disable next-line StringLiteral
          console.error('BlockNode: BlockTune should only emit BaseDocumentEvent');

          return;
        }

        const builder = new IndexBuilder();

        builder.from(event.detail.index).addTuneName(name);

        this.dispatchEvent(
          new TuneModifiedEvent(
            builder.build(),
            event.detail.data
          )
        );
      }
    );
  }
}

export type {
  BlockToolName,
  DataKey,
  BlockNodeSerialized
};

export {
  createBlockToolName,
  createDataKey
};
