import {
  BlockAddedEvent, type BlockNodeSerialized,
  BlockRemovedEvent,
  type EditorDocumentSerialized,
  EditorJSModel,
  EventType,
  ModelEvents
} from '@editorjs/model';
import 'reflect-metadata';
import { Inject, Service } from 'typedi';
import { BlockToolAdapter, CaretAdapter, FormattingAdapter } from '@editorjs/dom-adapters';
import ToolsManager from '../tools/ToolsManager.js';
import { BlockAPI, BlockToolData } from '@editorjs/editorjs';
import { CoreConfigValidated, EventBus, BlockAddedCoreEvent, BlockRemovedCoreEvent } from '@editorjs/sdk';
/**
 * Parameters for the BlocksManager.insert() method
 */
interface InsertBlockParameters {
  // id?: string;
  /**
   * Block tool name to insert
   */
  type?: string;
  /**
   * Block's initial data
   */
  data?: BlockToolData;
  /**
   * Index to insert block at
   */
  index?: number;
  // needToFocus?: boolean;
  /**
   * Flag indicates if block at index should be replaced
   */
  replace?: boolean;
  // tunes?: {[name: string]: BlockTuneData};
}

/**
 * BlocksManager is responsible for
 *  - handling block adding and removing events
 *  - updating the Model blocks data on user actions
 */
@Service()
export class BlocksManager {
  /**
   * Editor's Document Model instance to get and update blocks data
   */
  #model: EditorJSModel;

  /**
   * Editor's EventBus instance to exchange events between components
   */
  #eventBus: EventBus;

  /**
   * Caret Adapter instance
   * Required here to create BlockToolAdapter
   */
  #caretAdapter: CaretAdapter;

  /**
   * Tools manager instance to get block tools
   */
  #toolsManager: ToolsManager;

  /**
   * Editor's validated user configuration
   */
  #config: CoreConfigValidated;

  /**
   * Will be passed to BlockToolAdapter for rendering inputs` formatted text
   */
  #formattingAdapter: FormattingAdapter;

  /**
   * Returns Blocks count
   */
  public get blocksCount(): number {
    return this.#model.length;
  }

  /**
   * BlocksManager constructor
   * All parameters are injected thorugh the IoC container
   * @param model - Editor's Document Model instance
   * @param eventBus - Editor's EventBus instance
   * @param caretAdapter - Caret Adapter instance
   * @param toolsManager - Tools manager instance
   * @param formattingAdapter - will be passed to BlockToolAdapter for rendering inputs` formatted text
   * @param config - Editor validated configuration
   */
  constructor(
    model: EditorJSModel,
    eventBus: EventBus,
    caretAdapter: CaretAdapter,
    toolsManager: ToolsManager,
    formattingAdapter: FormattingAdapter,
    @Inject('EditorConfig') config: CoreConfigValidated
  ) {
    this.#model = model;
    this.#eventBus = eventBus;
    this.#caretAdapter = caretAdapter;
    this.#toolsManager = toolsManager;
    this.#formattingAdapter = formattingAdapter;
    this.#config = config;

    this.#model.addEventListener(EventType.Changed, event => this.#handleModelUpdate(event));
  }

  /**
   * Inserts a new block to the editor at the specified index
   * @param parameters - method paramaters object
   * @param parameters.type - block tool name to insert
   * @param parameters.data - block's initial data
   * @param parameters.index - index to insert block at
   // * @param parameters.needToFocus - flag indicates if caret should be set to block after insert
   * @param parameters.replace - flag indicates if block at index should be replaced
   */
  public insert({
    // id = undefined,
    type = this.#config.defaultBlock,
    data = {},
    index,
    // needToFocus = true,
    replace = false,
    // tunes = {},
  }: InsertBlockParameters = {}): void {
    let newIndex = index;

    if (newIndex === undefined) {
      newIndex = this.#model.length + (replace ? 0 : 1);
    }

    if (replace) {
      this.#model.removeBlock(this.#config.userId, newIndex);
    }

    this.#model.addBlock(this.#config.userId, {
      ...data,
      name: type,
    }, newIndex);
  }

  /**
   * Inserts several Blocks to specified index
   * @param blocks - array of blocks to insert
   * @param [index] - index to insert blocks at. If undefined, inserts at the end
   */
  public insertMany(blocks: BlockNodeSerialized[], index: number = this.#model.length + 1): void {
    blocks.forEach((block, i) => this.#model.addBlock(this.#config.userId, block, index + i));
  }

  /**
   * Re-initialize document
   * @param document - serialized document data
   */
  public render(document: EditorDocumentSerialized): void {
    this.#model.initializeDocument(document);
  }

  /**
   * Remove all blocks from Document
   */
  public clear(): void {
    this.#model.clearBlocks();
  }

  /**
   * Removes Block by index, or current block if index is not passed
   * @param index - index of a block to delete
   */
  public deleteBlock(index: number | undefined = this.#getCurrentBlockIndex()): void {
    if (index === undefined) {
      /**
       * @todo see what happens in legacy
       */
      throw new Error('No block selected to delete');
    }

    this.#model.removeBlock(this.#config.userId, index);
  }

  /**
   * Moves a block to a new index
   * @param toIndex - index where the block is moved to
   * @param [fromIndex] - block to move. Current block if not passed
   */
  public move(toIndex: number, fromIndex: number | undefined = this.#getCurrentBlockIndex()): void {
    if (fromIndex === undefined) {
      throw new Error('No block selected to move');
    }

    const block = this.#model.serialized.blocks[fromIndex];

    this.#model.removeBlock(this.#config.userId, fromIndex);
    this.#model.addBlock(this.#config.userId, block, toIndex + (fromIndex <= toIndex ? 1 : 0));
  }

  /**
   * Returns block index where user caret is placed
   */
  #getCurrentBlockIndex(): number | undefined {
    const caretIndex = this.#caretAdapter.userCaretIndex;

    return caretIndex?.blockIndex;
  }

  /**
   * Handles model update events
   * Filters only BlockAddedEvent and BlockRemovedEvent
   * @param event - Model update event
   */
  #handleModelUpdate(event: ModelEvents): void {
    switch (true) {
      case event instanceof BlockAddedEvent:
        void this.#handleBlockAddedEvent(event);
        break;
      case event instanceof BlockRemovedEvent:
        this.#handleBlockRemovedEvent(event);
        break;
      default:
    }
  }

  /**
   * Handles BlockAddedEvent
   * - creates BlockTool instance
   * - renders its content
   * - calls UI module to render the block
   * @param event - BlockAddedEvent
   */
  async #handleBlockAddedEvent(event: BlockAddedEvent): Promise<void> {
    const { index, data } = event.detail;

    if (index.blockIndex === undefined) {
      throw new Error('[BlockManager] Block index should be defined. Probably something wrong with the Editor Model. Please, report this issue');
    }

    const toolName = event.detail.data.name;

    const blockToolAdapter = new BlockToolAdapter(
      this.#config,
      this.#model,
      this.#eventBus,
      this.#caretAdapter,
      index.blockIndex,
      this.#formattingAdapter,
      toolName
    );

    const tool = this.#toolsManager.blockTools.get(data.name);

    if (tool === undefined) {
      throw new Error(`[BlockManager] Block Tool ${event.detail.data.name} not found`);
    }

    const block = tool.create({
      adapter: blockToolAdapter,
      data: data.data,
      block: {} as BlockAPI,
      readOnly: false,
    });

    try {
      const blockElement = await block.render();

      this.#eventBus.dispatchEvent(new BlockAddedCoreEvent({
        tool: tool.name,
        data: data.data,
        ui: blockElement,
        index: index.blockIndex,
      }));
    } catch (error) {
      console.error(`[BlockManager] Block Tool ${data.name} failed to render`, error);
    }
  }

  /**
   * Handles BlockRemovedEvent
   *   - callse UI module to remove the block
   * @param event - BlockRemovedEvent
   */
  #handleBlockRemovedEvent(event: BlockRemovedEvent): void {
    const { data, index } = event.detail;

    if (index.blockIndex === undefined) {
      throw new Error('Block index should be defined. Probably something wrong with the Editor Model. Please, report this issue');
    }

    this.#eventBus.dispatchEvent(new BlockRemovedCoreEvent({
      tool: data.name,
      index: index.blockIndex,
    }));
  }
}
