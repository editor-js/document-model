import 'reflect-metadata';
import { Inject, Service } from 'typedi';
import { BlocksManager } from '../components/BlockManager.js';
import { BlockToolData, ToolConfig } from '@editorjs/editorjs';
import { CoreConfigValidated } from '@editorjs/sdk';
import { BlocksAPI as BlocksApiInterface } from '@editorjs/sdk';
import { type BlockNodeSerialized, EditorDocumentSerialized } from '@editorjs/model';

/**
 * Blocks API
 *  - provides methods to work with blocks
 */
@Service()
export class BlocksAPI implements BlocksApiInterface {
  /**
   * BlocksManager instance to work with blocks
   */
  #blocksManager: BlocksManager;

  /**
   * EditorJS configuration
   */
  #config: CoreConfigValidated;

  /**
   * BlocksAPI class constructor
   * @param blocksManager - BlocksManager instance to work with blocks
   * @param config - EditorJS configuration
   */
  constructor(
    blocksManager: BlocksManager,
    @Inject('EditorConfig') config: CoreConfigValidated
  ) {
    this.#blocksManager = blocksManager;
    this.#config = config;
  }

  /**
   * Remove all blocks from Document
   */
  public clear(): void {
    return this.#blocksManager.clear();
  }

  /**
   * Render passed data
   * @param document - serialized document data to render
   */
  public render(document: EditorDocumentSerialized): void {
    return this.#blocksManager.render(document);
  }

  /**
   * Removes Block by index, or current block if index is not passed
   * @param index - index of a block to delete
   */
  public delete(index?: number): void {
    return this.#blocksManager.deleteBlock(index);
  }

  /**
   * Moves a block to a new index
   * @param toIndex - index where the block is moved to
   * @param [fromIndex] - block to move. Current block if not passed
   */
  public move(toIndex: number, fromIndex?: number): void {
    return this.#blocksManager.move(toIndex, fromIndex);
  }

  /**
   * Returns Blocks count
   */
  public getBlocksCount(): number {
    return this.#blocksManager.blocksCount;
  }

  /**
   * Inserts several Blocks to specified index
   * @param blocks - array of blocks to insert
   * @param [index] - index to insert blocks at. If undefined, inserts at the end
   */
  public insertMany(blocks: BlockNodeSerialized[], index?: number): void {
    return this.#blocksManager.insertMany(blocks, index);
  }

  /**
   * Inserts a new block to the editor
   * @param type - Block tool name to insert
   * @param data - Block's initial data
   * @param _config - not used but left for compatibility
   * @param index - index to insert block at
   * @param needToFocus - flag indicates if new block should be focused @todo implement
   * @param replace - flag indicates if block at index should be replaced @todo implement
   * @param id - id of the inserted block @todo implement
   */
  public insert(
    type: string = this.#config.defaultBlock,
    data: BlockToolData = {},
    /**
     * Not used but left for compatibility
     */
    _config: ToolConfig = {},
    index?: number,
    needToFocus?: boolean,
    replace?: boolean,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    id?: string
  ): void {
    this.#blocksManager.insert({
      type,
      data,
      index,
      replace,
      // needToFocus,
    });
  }
}
