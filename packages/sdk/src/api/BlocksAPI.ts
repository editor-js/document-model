import type { BlockToolData } from '@editorjs/editorjs';
import type {
  BlockId,
  BlockNodeInit,
  EditorDocumentSerialized,
  TextNodeSerialized,
  ValueSerialized
} from '@editorjs/model';

/**
 * Blocks API interface
 * Provides methods to work with blocks
 */
export interface BlocksAPI {
  /**
   * Inserts a new block to the editor
   * @todo return block api?
   * @param type - Block tool name to insert
   * @param data - Block's initial data
   * @param index - index to insert block at
   * @param focus - flag indicates if new block should be focused @todo implement
   * @param replace - flag indicates if block at index should be replaced @todo implement
   * @param id - id of the inserted block @todo implement
   */
  insert(
    type?: string,
    data?: BlockToolData,
    index?: number,
    focus?: boolean,
    replace?: boolean,
    id?: string
  ): void;

  /**
   * Remove all blocks from Document
   */
  clear(): void;

  /**
   * Render passed data
   * @param document - serialized document data to render
   */
  render(document: EditorDocumentSerialized): void;

  /**
   * Render passed HTML string
   * @param data
   * @returns
   */
  // renderFromHTML(data: string): Promise<void>;

  /**
   * Removes Block by index, or current block if index is not passed
   * @param indexOrId - index or id of a block to delete
   */
  delete(indexOrId?: number | string): void;

  /**
   * Moves a block to a new index
   * @param toIndex - index where the block is moved to
   * @param [fromIndex] - block to move. Current block if not passed
   */
  move(toIndex: number, fromIndex?: number): void;

  /**
   * Returns Block API object by passed Block index
   * @param index
   */
  // getBlockByIndex(index: number): BlockAPI | undefined;

  /**
   * Returns Block API object by passed Block id
   * @param id - id of the block
   */
  // getById(id: string): BlockAPI | null;

  /**
   * Returns current Block index
   * @returns
   */
  // getCurrentBlockIndex(): number;

  /**
   * Returns the index of Block by id;
   */
  // getBlockIndex(blockId: string): number;

  /**
   * Get Block API object by html element
   * @param element - html element to get Block by
   */
  // getBlockByElement(element: HTMLElement): BlockAPI | undefined;

  /**
   * Returns Blocks count
   */
  getBlocksCount(): number;

  /**
   * Inserts several Blocks to specified index
   * @param blocks - array of blocks to insert
   * @param [index] - index to insert blocks at. If undefined, inserts at the end
   */
  insertMany(
    blocks: BlockNodeInit[],
    index?: number,
  ): void; // BlockAPI[];

  /**
   * Returns block's index by its id
   * @param id - block id to get index for
   */
  getIndexById(id: string): number;

  /**
   * Returns block id by its index
   * @param index - block index to get id for
   */
  getIdByIndex(index: number): BlockId | undefined;

  /**
   * Returns serialized data for provided data key
   * @param indexOrId - index or id of the block
   * @param dataKey - data key to get
   */
  getData<V = unknown>(indexOrId: number | string, dataKey: string): TextNodeSerialized | ValueSerialized<V> | undefined;

  /**
   * Removes data by the data key
   * @param indexOrId - index or id of the block
   * @param dataKey - data key to remove
   */
  removeData(indexOrId: number | string, dataKey: string): void;

  /**
   * Creates data node with the given key
   * @param indexOrId - index or id of the block
   * @param dataKey - data key to create
   * @param [initialData] - optional initial data
   */
  createData<V = unknown>(indexOrId: number | string, dataKey: string, initialData?: TextNodeSerialized | ValueSerialized<V>): void;

  /**
   * Updates value by the given key
   * @param indexOrId - index or id of the block
   * @param dataKey - data key to update
   * @param value - new value
   */
  updateValue<V = unknown>(indexOrId: number | string, dataKey: string, value: V): void;

  /**
   * Creates data of an empty block with a passed type.
   * @param toolName - block tool name
   */
  // composeBlockData(toolName: string): Promise<BlockToolData>;

  /**
   * Updates block data by id
   * @param id - id of the block to update
   * @param data - (optional) the new data. Can be partial.
   * @param tunes - (optional) tune data
   */
  // update(id: string, data?: Partial<BlockToolData>, tunes?: { [name: string]: BlockTuneData }): Promise<BlockAPI>;

  /**
   * Converts block to another type. Both blocks should provide the conversionConfig.
   * @param id - id of the existed block to convert. Should provide 'conversionConfig.export' method
   * @param newType - new block type. Should provide 'conversionConfig.import' method
   * @param dataOverrides - optional data overrides for the new block
   * @throws Error if conversion is not possible
   */
  // convert(id: string, newType: string, dataOverrides?: BlockToolData): Promise<BlockAPI>;
}
