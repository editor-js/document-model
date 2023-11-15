import type { DataKey } from '../BlockNode';
import { BlockNode } from '../BlockNode/index.js';
import type { EditorDocumentSerialized, EditorDocumentConstructorParameters, Properties } from './types';
import type { BlockTuneName } from '../BlockTune';
import type { InlineToolData, InlineToolName } from '../inline-fragments';
import { IoCContainer, TOOLS_REGISTRY } from '../../IoC/index.js';
import { ToolsRegistry } from '../../tools/index.js';
import type { BlockNodeSerialized } from '../BlockNode/types';
import { EventBus } from '../../utils/EventBus/EventBus.js';
import { EventType } from '../../utils/EventBus/types/EventType.js';
import type {
  BlockTuneEvents,
  TextNodeEvents,
  ValueNodeEvents
} from '../../utils/EventBus/types/EventMap';
import {
  BlockAddedEvent,
  BlockRemovedEvent,
  PropertyModifiedEvent
} from '../../utils/EventBus/events/index.js';
import type { Constructor } from '../../utils/types.js';
import { BaseDocumentEvent } from '../../utils/EventBus/events/BaseEvent.js';

/**
 * EditorDocument class represents the top-level container for a tree-like structure of BlockNodes in an editor document.
 * It contains an array of BlockNodes representing the root-level nodes of the document.
 */
export class EditorDocument extends EventBus {
  /**
   * Private field representing the child BlockNodes of the EditorDocument
   */
  #children: BlockNode[] = [];

  /**
   * Private field representing the properties of the document
   */
  #properties: Properties;

  /**
   * Private field representing whether the EditorDocument has been initialized
   */
  #isInitialized = false;

  /**
   * Constructor for EditorDocument class.
   *
   * @param [args] - EditorDocument constructor arguments.
   * @param [args.blocks] - List of blocks to initialize the document with.
   * @param [args.properties] - The properties of the document.
   * @param [args.toolsRegistry] - ToolsRegistry instance for the current document. Defaults to a new ToolsRegistry instance.
   */
  constructor({
    blocks = [],
    properties = {},
    toolsRegistry = new ToolsRegistry(),
  }: EditorDocumentConstructorParameters = {}) {
    super();

    this.#properties = properties;

    const container = IoCContainer.of(this);

    container.set(TOOLS_REGISTRY, toolsRegistry);

    this.#initialize(blocks);

    this.#isInitialized = true;
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

    if (this.#isInitialized) {
      this.dispatchEvent(new BlockAddedEvent([ index ], blockNode.serialized));
    }
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

    if (this.#isInitialized) {
      this.dispatchEvent(new BlockRemovedEvent([ index ], blockNode.serialized));
    }
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

    if (this.#isInitialized) {
      this.dispatchEvent(
        new PropertyModifiedEvent(
          [name, 'property'],
          {
            value,
            previous: previousValue,
          })
      );
    }
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
      blocks: this.#children.map((block) => block.serialized),
      properties: this.#properties,
    };
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
        console.error('EditorDocument: BlockNode should only emit BaseDocumentEvent objects');

        return;
      }

      this.dispatchEvent(
        new (event.constructor as Constructor<TextNodeEvents | ValueNodeEvents | BlockTuneEvents>)(
          [...event.detail.index, index],
          event.detail.data
        )
      );
    });
  }

  /**
   * Initializes EditorDocument with passed blocks
   *
   * @param blocks - document serialized blocks
   */
  #initialize(blocks: BlockNodeSerialized[]): void {
    blocks.forEach((block) => {
      this.addBlock(block);
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
