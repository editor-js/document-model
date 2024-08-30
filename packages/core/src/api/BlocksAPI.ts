import 'reflect-metadata';
import { Inject, Service } from 'typedi';
import { BlocksManager } from '../components/BlockManager.js';
import { BlockToolData, ToolConfig } from '@editorjs/editorjs';
import { CoreConfigValidated } from '../entities/index.js';

/**
 * Blocks API
 *  - provides methods to work with blocks
 */
@Service()
export class BlocksAPI {
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data,
      index,
      replace,
    });
  }
}
