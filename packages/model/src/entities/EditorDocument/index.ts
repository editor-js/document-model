import { getContext } from '../../utils/Context.js';
import { BlockNode } from '../BlockNode/index.js';
import {
  createDataKey,
  Index,
  BlockIndex,
  DataIndex,
  TextIndex,
  type PartialIndex,
  EventBus,
  EventType,
  type DocumentId,
  type DataKey,
  type BlockId,
  type BlockIndexOrId,
  type Properties,
  type InlineToolData,
  type InlineToolName,
  type BlockTuneEvents,
  type TextNodeEvents,
  type ValueNodeEvents,
  type EditorDocumentSerialized,
  type BlockTuneName,
  type BlockNodeDataSerializedValue,
  type BlockNodeSerialized,
  type BlockNodeInit
} from '@editorjs/model-types';
import type { EditorDocumentConstructorParameters } from './types/index.js';
import type { TextNodeSerialized, InlineFragment, ValueSerialized } from '@editorjs/model-types';
import { IoCContainer, TOOLS_REGISTRY } from '../../IoC/index.js';
import { ToolsRegistry } from '../../tools/index.js';
import type { DeepReadonly } from '../../utils/DeepReadonly.js';
import {
  BlockAddedEvent,
  BlockRemovedEvent,
  PropertyModifiedEvent
} from '@editorjs/model-types';
import type { Constructor } from '../../utils/types.js';
import { BaseDocumentEvent, type ModifiedEventData, type TextFormattedEventData, type TextUnformattedEventData } from '@editorjs/model-types';
import { BlockAlreadyExistsError } from './errors/BlockAlreadyExistsError.js';

export type * from './types/index.js';

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
   * lookup index: maps each block's id to its BlockNode instance.
   * Kept in sync with #children by addBlock, removeBlock, and clear.
   */
  #blockById: Map<BlockId, BlockNode> = new Map();

  /**
   * Private field representing the properties of the document
   */
  #properties: Properties;

  /**
   * Constructor for EditorDocument class.
   *
   * To fill the document with blocks, use the `initialize` method.
   * @todo remove tools registry?
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
   * @param document - document serialized data
   */
  public initialize(document: Partial<Omit<EditorDocumentSerialized, 'blocks'>> & { blocks: BlockNodeInit[] }): void {
    this.clear();

    if (document.identifier !== undefined) {
      this.identifier = document.identifier as DocumentId;
    }

    document.blocks.forEach((block) => {
      this.addBlock(block);
    });

    if (document.properties) {
      Object.entries(document.properties)
        .forEach(([name, value]) => this.setProperty(name, value));
    }
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
   * @param blockNodeData - The data to create the BlockNode with. The `id` field is optional — auto-generated when omitted.
   * @param index - The index at which to add the BlockNode
   * @throws Error if the index is out of bounds
   */
  public addBlock(blockNodeData: BlockNodeInit, index?: number): void {
    const blockNode = new BlockNode({
      ...blockNodeData,
      parent: this,
    });

    if (blockNode.id !== undefined && this.#blockById.has(blockNode.id)) {
      throw new BlockAlreadyExistsError(blockNode.id);
    }

    if (index === undefined) {
      this.#children.push(blockNode);

      index = this.length - 1;
    } else {
      this.#checkIndexOutOfBounds(index);

      this.#children.splice(index, 0, blockNode);
    }

    this.#blockById.set(blockNode.id, blockNode);
    this.#listenAndBubbleBlockEvent(blockNode);

    /**
     * Dispatch BlockAddedEvent synchronously so it fires before any child DataNodeAddedEvents
     * (which are queued as microtasks during BlockNode construction), preserving root → leaves order
     * for add events.
     */
    this.dispatchEvent(new BlockAddedEvent(Index.block(index), blockNode.serialized, getContext<string | number>()!));
  }

  /**
   * Removes a BlockNode from the EditorDocument at the specified index or by id.
   * @param indexOrId - The index or block id of the BlockNode to remove
   * @throws Error if the index is out of bounds
   */
  public removeBlock(indexOrId: BlockIndexOrId): void {
    const resolvedIndex = this.resolveBlockIndex(indexOrId);

    this.#checkIndexOutOfBounds(resolvedIndex, this.length - 1);

    const [blockNode] = this.#children.splice(resolvedIndex, 1);

    this.#blockById.delete(blockNode.id);

    this.dispatchEvent(new BlockRemovedEvent(Index.block(resolvedIndex), blockNode.serialized, getContext<string | number>()!));
  }

  /**
   * Returns the BlockNode at the specified index or by id.
   * Throws an error if the index is out of bounds or id is not found.
   * @param indexOrId - The index or block id of the BlockNode to return
   * @throws Error if the index is out of bounds
   */
  public getBlock(indexOrId: BlockIndexOrId): BlockNode {
    const resolvedIndex = this.resolveBlockIndex(indexOrId);

    this.#checkIndexOutOfBounds(resolvedIndex, this.length - 1);

    return this.#children[resolvedIndex];
  }

  /**
   * Returns the BlockNode with the specified unique identifier in O(1).
   * Returns undefined if no block with that id exists.
   * @param id - The unique block identifier
   */
  public getBlockById(id: BlockId | string): BlockNode | undefined {
    return this.#blockById.get(id as BlockId);
  }

  /**
   * Returns the index of the BlockNode with the specified unique identifier.
   * Returns -1 if no block with that id exists.
   * @param id - The unique block identifier
   */
  public getBlockIndexById(id: BlockId | string): number {
    const block = this.#blockById.get(id as BlockId);

    if (block === undefined) {
      return -1;
    }

    return this.#children.indexOf(block);
  }

  /**
   * Creates a data node with passed key with initial data for the BlockNode at specified index or id
   * Throws an error if the index is out of bounds.
   * @param blockIndexOrId - block index or block id
   * @param key - key for the node
   * @param data - initial data of the node
   */
  public createDataNode(blockIndexOrId: BlockIndexOrId, key: DataKey | string, data: BlockNodeDataSerializedValue): void {
    const resolvedIndex = this.resolveBlockIndex(blockIndexOrId);

    this.#checkIndexOutOfBounds(resolvedIndex, this.length - 1);

    this.#children[resolvedIndex].createDataNode(createDataKey(key), data);
  }

  /**
   * Removes a data node with the passed key in the BlockNode at the specified index or id
   * @param indexOrId - block index or block id
   * @param key - key of the node to remove
   */
  public removeDataNode(indexOrId: BlockIndexOrId, key: DataKey | string): void {
    const resolvedIndex = this.resolveBlockIndex(indexOrId);

    this.#checkIndexOutOfBounds(resolvedIndex, this.length - 1);

    this.#children[resolvedIndex].removeDataNode(createDataKey(key));
  }

  /**
   * Returns data node by the block index or id and data key
   * @param indexOrId - block index or block id where data node is stored
   * @param key - data key of the data node
   */
  public getDataNode<V = unknown>(indexOrId: BlockIndexOrId, key: DataKey | string): ValueSerialized<V> | TextNodeSerialized | undefined {
    const resolvedIndex = this.resolveBlockIndex(indexOrId);

    this.#checkIndexOutOfBounds(resolvedIndex, this.length - 1);

    return this.#children[resolvedIndex].getDataNode<V>(createDataKey(key));
  }

  /**
   * Returns all text input content of a block, keyed by dot-notation data key.
   * @param indexOrId - numeric block index or block id
   * @throws Error if the index is out of bounds
   */
  public getBlockTextContent(indexOrId: BlockIndexOrId): Record<DataKey, TextNodeSerialized> {
    const resolvedIndex = this.resolveBlockIndex(indexOrId);

    this.#checkIndexOutOfBounds(resolvedIndex, this.length - 1);

    return this.#children[resolvedIndex].getTextContent();
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
   * @param name - The name of the property to return
   */
  public getProperty<T = unknown>(name: keyof Properties): T | undefined {
    return this.#properties[name] as T;
  }

  /**
   * Updates a property of the EditorDocument.
   * Adds the property if it does not exist.
   * @param name - The name of the property to update
   * @param value - The value to update the property with
   */
  public setProperty<T = unknown>(name: keyof Properties, value: T): void {
    const previousValue = this.getProperty(name);

    this.#properties[name] = value;

    this.dispatchEvent(
      new PropertyModifiedEvent(
        Index.property(name),
        {
          value,
          previous: previousValue,
        },
        getContext<string | number>()!
      )
    );
  }

  /**
   * Updates the ValueNode data associated with the BlockNode at the specified index or id.
   * @param blockIndexOrId - The index or block id of the BlockNode to update
   * @param dataKey - The key of the ValueNode to update
   * @param value - The new value of the ValueNode
   * @throws Error if the index is out of bounds
   */
  public updateValue<T = unknown>(blockIndexOrId: BlockIndexOrId, dataKey: DataKey, value: T): void {
    const resolvedIndex = this.resolveBlockIndex(blockIndexOrId);

    this.#checkIndexOutOfBounds(resolvedIndex, this.length - 1);

    this.#children[resolvedIndex].updateValue(dataKey, value);
  }

  /**
   * Updates BlockTune data associated with the BlockNode at the specified index or id.
   * @param blockIndexOrId - The index or block id of the BlockNode to update
   * @param tuneName - The name of the BlockTune to update
   * @param data - The data to update the BlockTune with
   * @throws Error if the index is out of bounds
   */
  public updateTuneData(blockIndexOrId: BlockIndexOrId, tuneName: BlockTuneName, data: Record<string, unknown>): void {
    const resolvedIndex = this.resolveBlockIndex(blockIndexOrId);

    this.#checkIndexOutOfBounds(resolvedIndex, this.length - 1);

    this.#children[resolvedIndex].updateTuneData(tuneName, data);
  }

  /**
   * Returns text for the specified block and data key
   * @param blockIndexOrId - index or block id of the block
   * @param dataKey - key of the data containing the text
   */
  public getText(blockIndexOrId: BlockIndexOrId, dataKey: DataKey): string {
    const resolvedIndex = this.resolveBlockIndex(blockIndexOrId);

    this.#checkIndexOutOfBounds(resolvedIndex, this.length - 1);

    return this.#children[resolvedIndex].getText(dataKey);
  }

  /**
   * Inserts text to the specified block
   * @param blockIndexOrId - index or block id of the block
   * @param dataKey - key of the data
   * @param text - text to insert
   * @param [start] - char index where to insert text
   */
  public insertText(blockIndexOrId: BlockIndexOrId, dataKey: DataKey, text: string, start?: number): void {
    const resolvedIndex = this.resolveBlockIndex(blockIndexOrId);

    this.#checkIndexOutOfBounds(resolvedIndex, this.length - 1);

    this.#children[resolvedIndex].insertText(dataKey, text, start);
  }

  /**
   * Removes text from specified block
   * @param blockIndexOrId - index or block id of the block
   * @param dataKey - key of the data
   * @param [start] - start char index of the range
   * @param [end] - end char index of the range
   */
  public removeText(blockIndexOrId: BlockIndexOrId, dataKey: DataKey, start?: number, end?: number): string {
    const resolvedIndex = this.resolveBlockIndex(blockIndexOrId);

    this.#checkIndexOutOfBounds(resolvedIndex, this.length - 1);

    return this.#children[resolvedIndex].removeText(dataKey, start, end);
  }

  /**
   * Formats text in the specified block
   * @param blockIndexOrId - index or block id of the block
   * @param dataKey - key of the data
   * @param tool - name of the Inline Tool to apply
   * @param start - start char index of the range
   * @param end - end char index of the range
   * @param [data] - Inline Tool data if applicable
   */
  public format(blockIndexOrId: BlockIndexOrId, dataKey: DataKey, tool: InlineToolName, start: number, end: number, data?: InlineToolData): void {
    const resolvedIndex = this.resolveBlockIndex(blockIndexOrId);

    this.#checkIndexOutOfBounds(resolvedIndex, this.length - 1);

    this.#children[resolvedIndex].format(dataKey, tool, start, end, data);
  }

  /**
   * Removes formatting from the specified block
   * @param blockIndexOrId - index or block id of the block
   * @param key - key of the data
   * @param tool - name of the Inline Tool to remove
   * @param start - start char index of the range
   * @param end - end char index of the range
   */
  public unformat(blockIndexOrId: BlockIndexOrId, key: DataKey, tool: InlineToolName, start: number, end: number): void {
    const resolvedIndex = this.resolveBlockIndex(blockIndexOrId);

    this.#checkIndexOutOfBounds(resolvedIndex, this.length - 1);

    this.#children[resolvedIndex].unformat(key, tool, start, end);
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
      blocks: this.#children.map(block => block.serialized),
      properties: this.#properties,
    };
  }

  /**
   * Returns array of InlineFragment objects for the specified range
   * @param blockIndexOrId - index or block id of the block
   * @param dataKey - key of the data
   * @param [start] - start char index of the range
   * @param [end] - end char index of the range
   * @param [tool] - name of the Inline Tool to filter by
   */
  public getFragments(blockIndexOrId: BlockIndexOrId, dataKey: DataKey, start?: number, end?: number, tool?: InlineToolName): InlineFragment[] {
    return this.#children[this.resolveBlockIndex(blockIndexOrId)].getFragments(dataKey, start, end, tool);
  }

  /**
   * Inserts data to the specified index
   * @param index - index to insert data
   * @param data - data to insert (text or blocks)
   */
  public insertData(index: Index, data: string | BlockNodeInit[] | BlockNodeDataSerializedValue): void {
    switch (true) {
      /**
       * @todo composite (multi-segment) TextIndex has undefined blockIndex/dataKey/textRange, so the assertions below would throw.
       * Not currently reachable — index always comes from PartialIndex.resolve(), which only builds single-segment TextIndex.
       * Guard explicitly if a composite index can ever reach this method.
       */
      case index instanceof TextIndex:
        this.insertText(index.blockIndex!, index.dataKey!, data as string, index.textRange![0]);
        break;
      case index instanceof DataIndex:
        this.createDataNode(index.blockIndex, index.dataKey, data);
        break;
      case index instanceof BlockIndex:
        (data as BlockNodeSerialized[])
          .forEach((blockData, i) => this.addBlock(blockData, index.blockIndex + i));
        break;
      default:
        throw new Error('Unsupported index');
    }
  }

  /**
   * Removes data from the specified index
   * @param index - index to remove data from
   * @param data - text or blocks to remove
   */
  public removeData(index: Index, data: string | BlockNodeInit[] | BlockNodeDataSerializedValue): void {
    switch (true) {
      /**
       * @todo composite (multi-segment) TextIndex has undefined blockIndex/dataKey/textRange, so the assertions below would throw.
       * Not currently reachable — index always comes from PartialIndex.resolve(), which only builds single-segment TextIndex.
       * Guard explicitly if a composite index can ever reach this method.
       */
      case index instanceof TextIndex:
        this.removeText(index.blockIndex!, index.dataKey!, index.textRange![0], index.textRange![0] + (data as string).length);
        break;
      case index instanceof DataIndex:
        this.removeDataNode(index.blockIndex, index.dataKey);
        break;
      case index instanceof BlockIndex:
        (data as BlockNodeSerialized[]).forEach(() => this.removeBlock(index.blockIndex));
        break;
      default:
        throw new Error('Unsupported index');
    }
  }

  /**
   * Modifies data for the specific index
   * @param index - index of data to modify
   * @param data - data to modify (includes current and previous values)
   */
  public modifyData(index: Index, data: ModifiedEventData): void {
    /**
     * @todo composite (multi-segment) TextIndex has undefined blockIndex/dataKey/textRange, so the assertions below would throw.
     * Not currently reachable — index always comes from PartialIndex.resolve(), which only builds single-segment TextIndex.
     * Guard explicitly if a composite index can ever reach this method.
     */
    if (index instanceof TextIndex) {
      if (data.value !== null) {
        this.format(index.blockIndex!, index.dataKey!, (data.value as TextFormattedEventData).tool, index.textRange![0], index.textRange![1]);
      } else if (data.previous !== null) {
        this.unformat(index.blockIndex!, index.dataKey!, (data.previous as TextUnformattedEventData).tool, index.textRange![0], index.textRange![1]);
      }
    }
    /**
     * @todo implement other actions
     */
  }

  /**
   * Clear all document's blocks (doesn't emit an event)
   */
  public clear(): void {
    Array.from(this.#children).forEach(() => this.removeBlock(0));
  }

  /**
   * Resolves a BlockIndexOrId to a numeric block index.
   * If a number is passed it is returned as-is.
   * If a BlockId is passed the index is looked up via the O(1) id map.
   * @param indexOrId - numeric index or block id
   * @throws Error if the id does not exist in the document
   */
  public resolveBlockIndex(indexOrId: BlockIndexOrId): number {
    if (typeof indexOrId === 'number') {
      return indexOrId;
    }

    const index = this.getBlockIndexById(indexOrId);

    if (index === -1) {
      throw new Error(`Block with id "${indexOrId}" not found`);
    }

    return index;
  }

  /**
   * Listens to BlockNode events and bubbles them to the EditorDocument
   * @param block - BlockNode to listen to
   */
  #listenAndBubbleBlockEvent(block: BlockNode): void {
    block.addEventListener(EventType.Changed, (event: Event) => {
      if (!(event instanceof BaseDocumentEvent)) {
        // Stryker disable next-line StringLiteral
        console.error('EditorDocument: BlockNode should only emit BaseDocumentEvent objects');

        return;
      }

      const blockIndex = this.#children.indexOf(block);
      const completeIndex = (event.detail.index as PartialIndex)
        .withBlockIndex(blockIndex)
        .withDocumentId(this.identifier)
        .resolve();

      this.dispatchEvent(
        new (event.constructor as Constructor<TextNodeEvents | ValueNodeEvents | BlockTuneEvents>)(
          completeIndex,
          event.detail.data
        )
      );
    });
  }

  /**
   * Checks if the index is out of bounds.
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
