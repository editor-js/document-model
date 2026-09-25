import { getContext } from '../../utils/Context.js';
import type { EditorDocument } from '../EditorDocument/index.js';
import { BlockTune } from '../BlockTune/index.js';
import { InvalidNodeTypeError } from './errors/InvalidNodeTypeError.js';
import { NonExistingKeyError } from './errors/NonExistingKeyError.js';
import type {
  BlockNodeConstructorParameters,
  BlockNodeData,
  BlockNodeDataValue,
  ChildNode
} from './types/index.js';
import { ValueNode } from '../ValueNode/index.js';
import { TextNode } from '../inline-fragments/index.js';
import type { InlineFragment, TextNodeSerialized, ValueSerialized } from '@editorjs/model-types';
import {
  PartialIndex,
  BlockChildType,
  createDataKey,
  createBlockId,
  generateBlockId,
  createBlockToolName,
  createBlockTuneName,
  get,
  has,
  set,
  remove,
  insert,
  EventBus,
  EventType,
  BaseDocumentEvent,
  type DataKey,
  type BlockId,
  type BlockToolName,
  type BlockTuneName,
  type BlockTuneSerialized,
  type BlockNodeDataSerialized,
  type BlockNodeDataSerializedValue,
  type BlockNodeSerialized,
  type InlineToolData,
  type InlineToolName,
  type TextNodeEvents
} from '@editorjs/model-types';
import { NODE_TYPE_HIDDEN_PROP } from '@editorjs/model-types';
import { mapObject } from '../../utils/mapObject.js';
import type { DeepReadonly } from '../../utils/DeepReadonly.js';
import {
  DataNodeRemovedEvent,
  DataNodeAddedEvent,
  TuneModifiedEvent,
  ValueModifiedEvent
} from '@editorjs/model-types';
import type { Constructor } from '../../utils/types.js';
import { AlreadyExistingKeyError } from './errors/AlreadyExistingKeyError.js';

/**
 * BlockNode class represents a node in a tree-like structure used to store and manipulate Blocks in an editor document.
 * A BlockNode can contain one or more child nodes of type TextNode or ValueNode.
 * It can also be associated with one or more BlockTunes, which can modify the behavior of the BlockNode.
 */
export class BlockNode extends EventBus {
  /**
   * Unique identifier of the Block
   */
  #id: BlockId;

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
   * @param args - BlockNode constructor arguments.
   * @param [args.id] - The unique identifier of the BlockNode. Auto-generated if not provided.
   * @param args.name - The name of the BlockNode.
   * @param [args.data] - The content of the BlockNode.
   * @param [args.parent] - The parent EditorDocument of the BlockNode.
   * @param [args.tunes] - The BlockTunes associated with the BlockNode.
   */
  constructor({
    id,
    name,
    data = {},
    parent,
    tunes = {},
  }: BlockNodeConstructorParameters) {
    super();

    this.#id = id !== undefined ? createBlockId(id) : generateBlockId();
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
   * Allows accessing Block unique identifier
   */
  public get id(): BlockId {
    return this.#id;
  }

  /**
   * Getter to access BlockNode parent
   */
  public get parent(): EditorDocument | null {
    return this.#parent;
  }

  /**
   * Getter to access BlockNode tunes
   */
  public get tunes(): Readonly<Record<string, BlockTune>> {
    return this.#tunes;
  }

  /**
   * Returns serialized object representing the BlockNode
   */
  public get serialized(): BlockNodeSerialized {
    const serializedData = mapObject(
      this.#data,
      entry => this.#serializeData(entry)
    );

    const serializedTunes = mapObject(
      this.#tunes,
      tune => tune.serialized
    );

    return {
      id: this.#id,
      name: this.#name,
      data: serializedData,
      tunes: serializedTunes,
    };
  }

  /**
   * Returns data node by the key
   * @param dataKey - key of the node to get
   */
  public getDataNode<V = unknown>(dataKey: DataKey): ValueSerialized<V> | TextNodeSerialized | undefined {
    const node = get(this.data, dataKey as string);

    if (node === undefined) {
      return;
    }

    if (!(node instanceof TextNode) && !(node instanceof ValueNode)) {
      throw new InvalidNodeTypeError(dataKey, 'text or a value');
    }

    return node.serialized;
  }

  /**
   * Creates a node at passed key with initial data
   * @param dataKey - key for the node
   * @param data - initial data of the node
   */
  public createDataNode(dataKey: DataKey, data: BlockNodeDataSerializedValue): void {
    const keys = (dataKey as string).split('.');
    const parent = get(this.#data, keys.slice(0, -1));
    const mappedData = this.#mapSerializedDataToNodes(data, dataKey as string);

    if (Array.isArray(parent)) {
      insert(this.#data, dataKey as string, mappedData);
    } else {
      if (has(this.#data, dataKey as string)) {
        throw new AlreadyExistingKeyError(dataKey);
      }

      set(this.#data, dataKey as string, mappedData);
    }

    const index = new PartialIndex({ dataKey });

    /**
     * Capture the context synchronously before entering the microtask,
     * because the WithContext wrapper will have already popped the stack
     * by the time the queued callback runs.
     */
    const userId = getContext<string | number>();

    /**
     * Need to delay the event so the order is
     * 1. BlockNodeAdded
     * 2. DataNodeAdded
     *
     * If done in sync, DataNodeAdded would be fired first
     */
    queueMicrotask(() => {
      this.dispatchEvent(new DataNodeAddedEvent(index, data, userId!));
    });
  };

  /**
   * Removes a node with the passed key
   * @param dataKey - key of the node to remove
   */
  public removeDataNode(dataKey: DataKey): void {
    if (!has(this.#data, dataKey as string)) {
      return;
    }

    const nodeData = this.#serializeData(get<BlockNodeDataValue>(this.#data, dataKey as string)!);

    remove(this.#data, dataKey as string);

    const index = new PartialIndex({ dataKey });

    this.dispatchEvent(new DataNodeRemovedEvent(index, nodeData, getContext<string | number>()!));
  }

  /**
   * Updates data in the BlockTune by the BlockTuneName
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
   * @param dataKey - The key of the ValueNode to update
   * @param value - The new value of the ValueNode
   */
  public updateValue<T = unknown>(dataKey: DataKey, value: T): void {
    try {
      this.#validateKey(dataKey, ValueNode);
    } catch (error) {
      if (!(error instanceof NonExistingKeyError)) {
        throw error;
      }

      /**
       * In case there is no data key for the value, we need to create a new ValueNode
       */
      set(this.#data, dataKey as string, this.#createValueNode(dataKey));
    }

    const node = get(this.#data, dataKey as string) as ValueNode<T>;

    node.update(value);
  }

  /**
   * Returns a text value for the specified data key
   * @param dataKey - key of the data
   */
  public getText(dataKey: DataKey): string {
    this.#validateKey(dataKey, TextNode);

    const node = get(this.#data, dataKey as string) as TextNode;

    return node.serialized.value;
  }

  /**
   * Inserts text to the specified text node by index, by default appends text to the end of the current value
   * @param dataKey - key of the data
   * @param text - text to insert
   * @param [start] - char index where to insert text
   */
  public insertText(dataKey: DataKey, text: string, start?: number): void {
    try {
      this.#validateKey(dataKey, TextNode);
    } catch (error) {
      if (!(error instanceof NonExistingKeyError)) {
        throw error;
      }

      /**
       * In case there is no data key for the text, we need to create a new TextNode
       */
      set(this.#data, dataKey as string, this.#createTextNode(dataKey));
    }

    const node = get(this.#data, dataKey as string) as TextNode;

    node.insertText(text, start);
  }

  /**
   * Removes text from specified text node
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
   * Returns all text inputs content
   */
  public getTextContent(): Record<DataKey, TextNodeSerialized> {
    return this.#getTextContent(this.#data);
  }

  /**
   * Recursively iterates over data and collects all the text inputs content
   * @param data - data to collect text from
   * @param prefix - key prefix for nested data
   */
  #getTextContent(data: BlockNodeData | BlockNodeData[] = this.#data, prefix = ''): Record<DataKey, TextNodeSerialized> {
    const result: Record<DataKey, TextNodeSerialized> = {};

    const entries = Array.isArray(data)
      ? data.map((item, index) => [index, item] as const)
      : Object.entries(data);

    for (const [key, value] of entries) {
      const fullKey = prefix ? `${prefix}.${key}` : String(key);

      if (value instanceof TextNode) {
        result[fullKey as DataKey] = value.serialized;
      } else if (Array.isArray(value)) {
        Object.assign(result, this.#getTextContent(value, fullKey));
      } else if (typeof value === 'object' && value !== null && !(value instanceof ValueNode)) {
        Object.assign(result, this.#getTextContent(value as BlockNodeData, fullKey));
      }
    }

    return result;
  }

  /**
   * Initializes BlockNode with passed block data
   * @param data - block data
   */
  #initialize(data: BlockNodeDataSerialized): void {
    for (const [key, value] of Object.entries(data)) {
      this.createDataNode(createDataKey(key), value);
    }
  }

  /**
   * Recursively serializes data value
   * @param data - data to serialize
   */
  #serializeData(data: BlockNodeDataValue): BlockNodeDataSerializedValue {
    if (Array.isArray(data)) {
      return data.map(entry => this.#serializeData(entry)) as BlockNodeDataSerialized[];
    }

    if (data instanceof ValueNode || data instanceof TextNode) {
      return data.serialized;
    }

    return mapObject(data, entry => this.#serializeData(entry));
  };

  /**
   * Recursively maps serialized data to BlockNodeData
   *
   * 1. If value is an object with NODE_TYPE_HIDDEN_PROP, then it's a serialized node.
   * a. If NODE_TYPE_HIDDEN_PROP is BlockChildType.Value, then it's a serialized ValueNode
   * b. If NODE_TYPE_HIDDEN_PROP is BlockChildType.Text, then it's a serialized TextNode
   * 2. If value is an array, then it's an array of serialized nodes, so map it recursively
   * 3. If value is an object without NODE_TYPE_HIDDEN_PROP, then it's a JSON object, so map it recursively
   * 4. Otherwise, it's a primitive value, so create a ValueNode with it
   * @param value - serialized value
   * @param key - keypath of the current value
   */
  #mapSerializedDataToNodes(value: BlockNodeDataSerializedValue, key: string): BlockNodeData | BlockNodeDataValue {
    if (Array.isArray(value)) {
      return value.map((v, i) => this.#mapSerializedDataToNodes(v, `${key}.${i}`)) as BlockNodeData[] | ChildNode[];
    }

    if (typeof value === 'object' && value !== null) {
      if (NODE_TYPE_HIDDEN_PROP in value) {
        switch (value[NODE_TYPE_HIDDEN_PROP]) {
          case BlockChildType.Value: {
            return this.#createValueNode(createDataKey(key), value);
          }
          case BlockChildType.Text: {
            return this.#createTextNode(createDataKey(key), value as TextNodeSerialized);
          }
        }
      }

      return mapObject(value as BlockNodeDataSerialized, (v, k) => this.#mapSerializedDataToNodes(v, `${key}.${k}`));
    }

    const node = new ValueNode({ value });

    this.#listenAndBubbleValueNodeEvent(node, key as DataKey);

    return node;
  };

  /**
   * Creates new text node with passed key and initial value
   * @param key - DataKey for the new text node
   * @param value - initial value for the new text node
   */
  #createTextNode(key: DataKey, value?: TextNodeSerialized): TextNode {
    const node = new TextNode(value);

    this.#listenAndBubbleTextNodeEvent(node, key);

    return node;
  }

  /**
   * Creates new value node with passed key and initial value
   * @param key - DataKey for the new value node
   * @param value - initial value for the new value node
   */
  #createValueNode(key: DataKey, value?: BlockNodeDataSerializedValue): ValueNode {
    const node = new ValueNode({ value });

    this.#listenAndBubbleValueNodeEvent(node, key);

    return node;
  };

  /**
   * Validates data key and node type
   * @param key - key to validate
   * @param [Node] - node type to check
   */
  #validateKey(key: DataKey, Node?: typeof ValueNode | typeof TextNode): void {
    if (!has(this.#data, key as string)) {
      throw new NonExistingKeyError(key);
    }

    if (Node && !(get(this.#data, key as string) instanceof Node)) {
      throw new InvalidNodeTypeError(key, Node.name);
    }
  }

  /**
   * Listens to TextNode events and bubbles them to the BlockNode
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

        this.dispatchEvent(
          new (event.constructor as Constructor<TextNodeEvents>)(
            new PartialIndex({ textRange: (event.detail.index as PartialIndex).textRange,
              dataKey: key }),
            event.detail.data
          )
        );
      }
    );
  }

  /**
   * Listens to ValueNode events and bubbles them to the BlockNode
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

        this.dispatchEvent(
          new ValueModifiedEvent(
            new PartialIndex({ dataKey: key }),
            event.detail.data,
            getContext<string | number>()!
          )
        );
      }
    );
  }

  /**
   * Listens to BlockTune events and bubbles them to the BlockNode
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

        this.dispatchEvent(
          new TuneModifiedEvent(
            new PartialIndex({ tuneKey: (event.detail.index as PartialIndex).tuneKey,
              tuneName: name }),
            event.detail.data,
            'user'
          )
        );
      }
    );
  }
}
