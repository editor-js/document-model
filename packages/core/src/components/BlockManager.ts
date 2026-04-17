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

  /**
   * If true, moves caret to the new block
   */
  focus?: boolean;
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
   * Local registry of block adapters maintained by BlocksManager.
   * This allows us to update adapter indices synchronously when blocks are
   * added/removed to ensure adapters reflect the current model state before
   * any nested model events are processed.
   */
  #adapters: BlockToolAdapter[] = [];

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

    // eslint-disable-next-line @typescript-eslint/no-misused-promises -- Need to bubble the promise up in case of errors
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
    focus = false,
    replace = false,
    // tunes = {},
  }: InsertBlockParameters = {}): void {
    let newIndex = index;

    if (newIndex === undefined) {
      newIndex = this.#model.length + (replace ? -1 : 0);
    }

    if (replace) {
      this.#model.removeBlock(this.#config.userId, newIndex);
    }

    this.#model.addBlock(this.#config.userId, {
      ...data,
      name: type,
    }, newIndex);

    if (focus) {
      /**
       * @todo think of how to set the focus without knowing the data key
       */
    }
  }

  /**
   * Inserts several Blocks to specified index
   * @param blocks - array of blocks to insert
   * @param [index] - index to insert blocks at. If undefined, inserts at the end
   */
  public insertMany(blocks: BlockNodeSerialized[], index: number = this.#model.length): void {
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

    /**
     * Do nothing if fromIndex and toIndex are the same
     */
    if (fromIndex === toIndex) {
      return;
    }

    const block = this.#model.serialized.blocks[fromIndex];

    this.#model.removeBlock(this.#config.userId, fromIndex);
    this.#model.addBlock(this.#config.userId, block, toIndex);
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
  #handleModelUpdate(event: ModelEvents): Promise<void> | void {
    switch (true) {
      case event instanceof BlockAddedEvent:
        return this.#handleBlockAddedEvent(event);
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

    // Shift existing adapters indices to make room for the new block.
    // This must happen synchronously before we create and render the new
    // block adapter so that any nested model events produced during tool
    // rendering will see correct adapter indices.
    for (const adapter of this.#adapters) {
      const current = adapter.getBlockIndex().blockIndex;

      if (current !== undefined && current >= index.blockIndex) {
        adapter.setBlockIndex(current + 1);
      }
    }

    const blockToolAdapter = new BlockToolAdapter(
      this.#config,
      this.#model,
      this.#eventBus,
      this.#caretAdapter,
      index.blockIndex,
      this.#formattingAdapter
    );

    /**
     * We store blocks managers in caret adapter to give it access to blocks` inputs
     * without additional storing inputs in the caret adapter
     * Thus, it won't care about block index change (block removed, block added, block moved)
     */
    // Register new adapter locally and attach it to caret adapter.
    this.#adapters.splice(index.blockIndex, 0, blockToolAdapter);
    this.#caretAdapter.attachBlock(blockToolAdapter);

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

    // Remove and detach adapter related to the removed block, then shift
    // indices of adapters that were after the removed one.
    const removedIndex = index.blockIndex;

    const adapterIndex = this.#adapters.findIndex(a => a.getBlockIndex().blockIndex === removedIndex);

    if (adapterIndex !== -1) {
      const [removedAdapter] = this.#adapters.splice(adapterIndex, 1);
      this.#caretAdapter.detachBlock(removedAdapter.getBlockIndex());
    }

    for (const adapter of this.#adapters) {
      const current = adapter.getBlockIndex().blockIndex;

      if (current !== undefined && current > removedIndex) {
        adapter.setBlockIndex(current - 1);
      }
    }

    this.#eventBus.dispatchEvent(new BlockRemovedCoreEvent({
      tool: data.name,
      index: index.blockIndex,
    }));

    /**
     * @todo Detach block tool adapter from caret adapter to clear memory
     */
  }
}
