import {
  type BlockNodeSerialized,
  type EditorDocumentSerialized,
  EditorJSModel
} from '@editorjs/model';
import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import { TOKENS } from '../tokens.js';
import ToolsManager from '../tools/ToolsManager.js';
import { BlockToolData } from '@editorjs/editorjs';
import {
  CoreConfigValidated,
  EventBus
} from '@editorjs/sdk';

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
 * BlocksManager is responsible for block lifecycle operations:
 *  - insert, delete, move, render, clear
 *
 * Model event handling (BlockAddedEvent / BlockRemovedEvent) and rendering
 * are intentionally delegated to BlockRenderer, keeping this class free of
 * any Adapter dependency and avoiding the circular dependency:
 *   BlocksManager → Adapter → EditorAPI → BlocksAPI → BlocksManager
 */
@injectable()
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
   * Tools manager instance to get block tools
   */
  #toolsManager: ToolsManager;

  /**
   * Editor's validated user configuration
   */
  #config: CoreConfigValidated;

  /**
   * Returns Blocks count
   */
  public get blocksCount(): number {
    return this.#model.length;
  }

  /**
   * BlocksManager constructor
   * All parameters are injected through the IoC container
   * @param model - Editor's Document Model instance
   * @param eventBus - Editor's EventBus instance
   * @param toolsManager - Tools manager instance
   * @param config - Editor validated configuration
   */
  constructor(
    model: EditorJSModel,
    eventBus: EventBus,
    toolsManager: ToolsManager,
    @inject(TOKENS.EditorConfig) config: CoreConfigValidated
  ) {
    this.#model = model;
    this.#eventBus = eventBus;
    this.#toolsManager = toolsManager;
    this.#config = config;
  }

  /**
   * Inserts a new block to the editor at the specified index
   * @param parameters - method parameters object
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
    const userCaret = this.#model.getCaret(this.#config.userId);
    const caretIndex = userCaret?.index;

    return caretIndex?.blockIndex;
  }
}
