import type { DocumentId } from '../../EventBus/index';
import { getContext } from '../../utils/Context.js';
import { createDataKey, type DataKey } from '../BlockNode/index.js';
import { BlockNode } from '../BlockNode/index.js';
import { IndexBuilder } from '../Index/IndexBuilder.js';
import type { EditorDocumentSerialized, EditorDocumentConstructorParameters, Properties } from './types';
import type { BlockTuneName } from '../BlockTune';
import { type InlineFragment, type InlineToolData, type InlineToolName } from '../inline-fragments/index.js';
import { IoCContainer, TOOLS_REGISTRY } from '../../IoC/index.js';
import { ToolsRegistry } from '../../tools/index.js';
import type { BlockNodeDataSerializedValue, BlockNodeSerialized } from '../BlockNode/types';
import type { DeepReadonly } from '../../utils/DeepReadonly';
import { EventBus } from '../../EventBus/EventBus.js';
import { EventType } from '../../EventBus/types/EventType.js';
import type {
  BlockTuneEvents,
  TextNodeEvents,
  ValueNodeEvents
} from '../../EventBus/types/EventMap';
import {
  BlockAddedEvent,
  BlockRemovedEvent,
  PropertyModifiedEvent, type TextFormattedEventData, type TextUnformattedEventData
} from '../../EventBus/events/index.js';
import type { Constructor } from '../../utils/types.js';
import { BaseDocumentEvent, type ModifiedEventData } from '../../EventBus/events/BaseEvent.js';
import type { Index } from '../Index/index.js';

export * from './types/index.js';

/**
 * EditorDocument class represents the top-level container for a tree-like structure of BlockNodes in an editor document.
 * It contains an array of BlockNodes representing the root-level nodes of the document.
 */
export class EditorDocument extends EventBus {
  /**
   * Document identifier
   */
  public identifier: DocumentId;

  /**
   * Private field representing the child BlockNodes of the EditorDocument
   */
  #children: BlockNode[] = [];

  /**
   * Private field representing the properties of the document
   */
  #properties: Properties;

  /**
   * Constructor for EditorDocument class.
   *
   * To fill the document with blocks, use the `initialize` method.
   *
   * @todo remove tools registry?
   *
   * @param [args] - EditorDocument constructor arguments.
   * @param args.identifier - Document identifier
   * @param [args.properties] - The properties of the document.
   * @param [args.toolsRegistry] - ToolsRegistry instance for the current document. Defaults to a new ToolsRegistry instance.
   */
  constructor({
    identifier,
    properties = {},
    toolsRegistry = new ToolsRegistry(),
  }: EditorDocumentConstructorParameters) {
    super();

    this.identifier = identifier as DocumentId;

    this.#properties = properties;

    const container = IoCContainer.of(this);

    container.set(TOOLS_REGISTRY, toolsRegistry);
  }

  /**
   * Initializes EditorDocument with passed blocks
   *
   * @param blocks - document serialized blocks
   */
  public initialize(blocks: BlockNodeSerialized[]): void {
    this.clear();

    blocks.forEach((block) => {
      this.addBlock(block);
    });
  }

  /**
   * Allows accessing Document child nodes
   */
  public get children(): ReadonlyArray<DeepReadonly<BlockNode>> {
    return this.#children;
  }

  /**
   * Returns count of child BlockNodes of the EditorDocument.
   */
  public get length(): number {
    return this.#children.length;
  }

  /**
   * Adds a BlockNode to the EditorDocument at the specified index.
   * If no index is provided, the BlockNode will be added to the end of the array.
   *
   * @param blockNodeData - The data to create the BlockNode with
   * @param index - The index at which to add the BlockNode
   * @throws Error if the index is out of bounds
   */
  public addBlock(blockNodeData: Pick<BlockNodeSerialized, 'name'> & Partial<Omit<BlockNodeSerialized, 'name'>>, index?: number): void {
    const blockNode = new BlockNode({
      ...blockNodeData,
      parent: this,
    });


    if (index === undefined) {
      this.#children.push(blockNode);

      index = this.length - 1;
    } else {
      this.#checkIndexOutOfBounds(index);

      this.#children.splice(index, 0, blockNode);
    }

    this.#listenAndBubbleBlockEvent(blockNode, index);

    const builder = new IndexBuilder();

    builder.addBlockIndex(index);

    this.dispatchEvent(new BlockAddedEvent(builder.build(), blockNode.serialized, getContext<string | number>()!));
  }

  /**
   * Moves a BlockNode from one index to another
   *
   * @param from - The index of the BlockNode to move
   * @param to - The index to move the BlockNode to
   * @throws Error if the index is out of bounds
   */
  public moveBlock(from: number, to: number): void {
    this.#checkIndexOutOfBounds(from);
    this.#checkIndexOutOfBounds(to);

    const blockToMove = this.#children.splice(from, 1)[0];

    this.#children.splice(to, 0, blockToMove);
  }

  /**
   * Removes a BlockNode from the EditorDocument at the specified index.
   *
   * @param index - The index of the BlockNode to remove
   * @throws Error if the index is out of bounds
   */
  public removeBlock(index: number): void {
    this.#checkIndexOutOfBounds(index, this.length - 1);

    const [ blockNode ] = this.#children.splice(index, 1);

    const builder = new IndexBuilder();

    builder.addBlockIndex(index);

    this.dispatchEvent(new BlockRemovedEvent(builder.build(), blockNode.serialized, getContext<string | number>()!));
  }

  /**
   * Returns the BlockNode at the specified index.
   * Throws an error if the index is out of bounds.
   *
   * @param index - The index of the BlockNode to return
   * @throws Error if the index is out of bounds
   */
  public getBlock(index: number): BlockNode {
    this.#checkIndexOutOfBounds(index, this.length - 1);

    return this.#children[index];
  }

  /**
   * Creates a data node with passed key with initial data for the BlockNode at specified index
   * Throws an error if the index is out of bounds.
   *
   * @param index - block index
   * @param key - key for the node
   * @param data - initial data of the node
   */
  public createDataNode(index: number, key: DataKey | string, data: BlockNodeDataSerializedValue): void {
    this.#checkIndexOutOfBounds(index, this.length - 1);

    this.#children[index].createDataNode(createDataKey(key), data);
  }

  /**
   * Removes a data node with the passed key in the BlockNode at the specified index
   *
   * @param index - block index
   * @param key - key of the node to remove
   */
  public removeDataNode(index: number, key: DataKey | string): void {
    this.#checkIndexOutOfBounds(index, this.length - 1);

    this.#children[index].removeDataNode(createDataKey(key));
  }


  /**
   * Returns the serialised properties of the EditorDocument.
   */
  public get properties(): Properties {
    return this.#properties;
  }

  /**
   * Returns property by name.
   * Returns undefined if property does not exist.
   *
   * @param name - The name of the property to return
   */
  public getProperty<T = unknown>(name: keyof Properties): T | undefined {
    return this.#properties[name] as T;
  }

  /**
   * Updates a property of the EditorDocument.
   * Adds the property if it does not exist.
   *
   * @param name - The name of the property to update
   * @param value - The value to update the property with
   */
  public setProperty<T = unknown>(name: keyof Properties, value: T): void {
    const previousValue = this.getProperty(name);

    this.#properties[name] = value;

    const builder = new IndexBuilder();

    builder.addPropertyName(name);

    this.dispatchEvent(
      new PropertyModifiedEvent(
        builder.build(),
        {
          value,
          previous: previousValue,
        },
        getContext<string | number>()!
      )
    );
  }

  /**
   * Updates the ValueNode data associated with the BlockNode at the specified index.
   *
   * @param blockIndex - The index of the BlockNode to update
   * @param dataKey - The key of the ValueNode to update
   * @param value - The new value of the ValueNode
   * @throws Error if the index is out of bounds
   */
  public updateValue<T = unknown>(blockIndex: number, dataKey: DataKey, value: T): void {
    this.#checkIndexOutOfBounds(blockIndex, this.length - 1);

    this.#children[blockIndex].updateValue(dataKey, value);
  }

  /**
   * Updates BlockTune data associated with the BlockNode at the specified index.
   *
   * @param blockIndex - The index of the BlockNode to update
   * @param tuneName - The name of the BlockTune to update
   * @param data - The data to update the BlockTune with
   * @throws Error if the index is out of bounds
   */
  public updateTuneData(blockIndex: number, tuneName: BlockTuneName, data: Record<string, unknown>): void {
    this.#checkIndexOutOfBounds(blockIndex, this.length - 1);

    this.#children[blockIndex].updateTuneData(tuneName, data);
  }

  /**
   * Returns text for the specified block and data key
   *
   * @param blockIndex - index of the block
   * @param dataKey - key of the data containing the text
   */
  public getText(blockIndex: number, dataKey: DataKey): string {
    this.#checkIndexOutOfBounds(blockIndex, this.length - 1);

    return this.#children[blockIndex].getText(dataKey);
  }

  /**
   * Inserts text to the specified block
   *
   * @param blockIndex - index of the block
   * @param dataKey - key of the data
   * @param text - text to insert
   * @param [start] - char index where to insert text
   */
  public insertText(blockIndex: number, dataKey: DataKey, text: string, start?: number): void {
    this.#checkIndexOutOfBounds(blockIndex, this.length - 1);

    this.#children[blockIndex].insertText(dataKey, text, start);
  }

  /**
   * Removes text from specified block
   *
   * @param blockIndex - index of the block
   * @param dataKey - key of the data
   * @param [start] - start char index of the range
   * @param [end] - end char index of the range
   */
  public removeText(blockIndex: number, dataKey: DataKey, start?: number, end?: number): string {
    this.#checkIndexOutOfBounds(blockIndex, this.length - 1);

    return this.#children[blockIndex].removeText(dataKey, start, end);
  }

  /**
   * Formats text in the specified block
   *
   * @param blockIndex - index of the block
   * @param dataKey - key of the data
   * @param tool - name of the Inline Tool to apply
   * @param start - start char index of the range
   * @param end - end char index of the range
   * @param [data] - Inline Tool data if applicable
   */
  public format(blockIndex: number, dataKey: DataKey, tool: InlineToolName, start: number, end: number, data?: InlineToolData): void {
    this.#checkIndexOutOfBounds(blockIndex, this.length - 1);

    this.#children[blockIndex].format(dataKey, tool, start, end, data);
  }

  /**
   * Removes formatting from the specified block
   *
   * @param blockIndex - index of the block
   * @param key - key of the data
   * @param tool - name of the Inline Tool to remove
   * @param start - start char index of the range
   * @param end - end char index of the range
   */
  public unformat(blockIndex: number, key: DataKey, tool: InlineToolName, start: number, end: number): void {
    this.#checkIndexOutOfBounds(blockIndex, this.length - 1);

    this.#children[blockIndex].unformat(key, tool, start, end);
  }

  /**
   * Returns serialized data associated with the document
   *
   * Data contains:
   * - blocks - array of serialized blocks
   * - properties - JSON object with document properties (eg read-only)
   */
  public get serialized(): EditorDocumentSerialized {
    return {
      identifier: this.identifier,
      blocks: this.#children.map((block) => block.serialized),
      properties: this.#properties,
    };
  }

  /**
   * Returns array of InlineFragment objects for the specified range
   *
   * @param blockIndex - index of the block
   * @param dataKey - key of the data
   * @param [start] - start char index of the range
   * @param [end] - end char index of the range
   * @param [tool] - name of the Inline Tool to filter by
   */
  public getFragments(blockIndex: number, dataKey: DataKey, start?: number, end?: number, tool?: InlineToolName): InlineFragment[] {
    return this.#children[blockIndex].getFragments(dataKey, start, end, tool);
  }

  /**
   * Inserts data to the specified index
   *
   * @param index - index to insert data
   * @param data - data to insert (text or blocks)
   */
  public insertData(index: Index, data: string | BlockNodeSerialized[] | BlockNodeDataSerializedValue): void {
    switch (true) {
      case index.isTextIndex:
        this.insertText(index.blockIndex!, index.dataKey!, data as string, index.textRange![0]);
        break;

      case index.isDataIndex:
        this.createDataNode(index.blockIndex!, index.dataKey!, data as BlockNodeDataSerializedValue);
        break;

      case index.isBlockIndex:
        (data as BlockNodeSerialized[])
          .forEach((blockData, i) => this.addBlock(blockData, index.blockIndex! + i));
        break;
      default:
        throw new Error('Unsupported index');
    }
  }

  /**
   * Removes data from the specified index
   *
   * @param index - index to remove data from
   * @param data - text or blocks to remove
   */
  public removeData(index: Index, data: string | BlockNodeSerialized[] | BlockNodeDataSerializedValue): void {
    switch (true) {
      case index.isTextIndex:
        this.removeText(index.blockIndex!, index.dataKey!, index.textRange![0], index.textRange![0] + (data as string).length);
        break;

      case index.isDataIndex:
        this.removeDataNode(index.blockIndex!, index.dataKey!);
        break;

      case index.isBlockIndex:
        (data as BlockNodeSerialized[]).forEach(() => this.removeBlock(index.blockIndex!));
        break;
      default:
        throw new Error('Unsupported index');
    }
  }

  /**
   * Modifies data for the specific index
   *
   * @param index - index of data to modify
   * @param data - data to modify (includes current and previous values)
   */
  public modifyData(index: Index, data: ModifiedEventData): void {
    switch (true) {
      case index.isTextIndex:
        if (data.value !== null) {
          this.format(index.blockIndex!, index.dataKey!, (data.value as TextFormattedEventData).tool, index.textRange![0], index.textRange![1]);
        } else if (data.previous !== null) {
          this.unformat(index.blockIndex!, index.dataKey!, (data.previous as TextUnformattedEventData).tool, index.textRange![0], index.textRange![1]);
        }

      default:
      /**
       * @todo implement other actions
       */
    }
  }

  /**
   * Clear all document's blocks (doesn't emit an event)
   */
  public clear(): void {
    Array.from(this.#children).forEach(() => this.removeBlock(0));
  }

  /**
   * Listens to BlockNode events and bubbles them to the EditorDocument
   *
   * @param block - BlockNode to listen to
   * @param index - index of the BlockNode
   */
  #listenAndBubbleBlockEvent(block: BlockNode, index: number): void {
    block.addEventListener(EventType.Changed, (event: Event) => {
      if (!(event instanceof BaseDocumentEvent)) {
        // Stryker disable next-line StringLiteral
        console.error('EditorDocument: BlockNode should only emit BaseDocumentEvent objects');

        return;
      }

      const builder = new IndexBuilder();

      builder.from(event.detail.index)
        .addDocumentId(this.identifier)
        .addBlockIndex(index);

      this.dispatchEvent(
        new (event.constructor as Constructor<TextNodeEvents | ValueNodeEvents | BlockTuneEvents>)(
          builder.build(),
          event.detail.data
        )
      );
    });
  }

  /**
   * Checks if the index is out of bounds.
   *
   * @param index - The index to check
   * @param max - The maximum index value. Defaults to the length of the blocks array.
   * @throws Error if the index is out of bounds
   */
  #checkIndexOutOfBounds(index: number, max: number = this.length): void {
    if (index < 0 || index > max) {
      throw new Error('Index out of bounds');
    }
  }
}
