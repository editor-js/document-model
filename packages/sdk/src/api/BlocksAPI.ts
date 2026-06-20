import type { BlockToolData } from '@editorjs/editorjs';
import type {
  BlockId,
  BlockNodeInit,
  DocumentData,
  TextNodeSerialized,
  ValueSerialized
} from '@editorjs/model-types';

/**
 * Blocks API interface
 * Provides methods to work with blocks
 */
export interface BlocksAPI {
  /**
   * Inserts a new block to the editor
   * @todo return block api?
   * @param [params] - optional insert parameters
   * @param [params.type] - Block tool name to insert, inserts default block if not specified
   * @param [params.data] - Block's initial data
   * @param [params.index] - index to insert block at
   * @param [params.focus] - flag indicates if new block should be focused @todo implement
   * @param [params.replace] - flag indicates if block at index should be replaced @todo implement
   * @param [params.id] - id of the inserted block @todo implement
   */
  insert(params?: {
    /** Block tool name to insert */
    type?: string;
    /** Block's initial data */
    data?: BlockToolData;
    /** Index to insert block at */
    index?: number;
    /** Flag indicates if new block should be focused */
    focus?: boolean;
    /** Flag indicates if block at index should be replaced */
    replace?: boolean;
    /** Id of the inserted block */
    id?: string;
    /** User id. Defaults to the current user id from the config */
    userId?: string | number;
  }): void;

  /**
   * Remove all blocks from Document
   */
  clear(): void;

  /**
   * Render passed data
   * @param document - serialized document data to render
   */
  render(document: DocumentData): void;

  /**
   * Render passed HTML string
   * @param data
   * @returns
   */
  // renderFromHTML(data: string): Promise<void>;

  /**
   * Removes Block by index or id, or current block if params are not passed
   * @param [params] - optional delete parameters
   * @param [params.block] - index or id of a block to delete
   * @param [params.userId] - user id. Defaults to the current user id from the config
   */
  delete(params?: {
    /** Index or id of a block to delete */
    block?: number | string;
    /** User id. Defaults to the current user id from the config */
    userId?: string | number;
  }): void;

  /**
   * Moves a block to a new index
   * @param params - move parameters
   * @param params.toIndex - index where the block is moved to
   * @param [params.fromIndex] - block to move. Current block if not passed
   * @param [params.userId] - user id. Defaults to the current user id from the config
   */
  move(params: {
    /** Index where the block is moved to */
    toIndex: number;
    /** Block to move. Current block if not passed */
    fromIndex?: number;
    /** User id. Defaults to the current user id from the config */
    userId?: string | number;
  }): void;

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
   * @param params - insertMany parameters
   * @param params.blocks - array of blocks to insert
   * @param [params.index] - index to insert blocks at. If undefined, inserts at the end
   * @param [params.userId] - user id. Defaults to the current user id from the config
   */
  insertMany(params: {
    /** Array of blocks to insert */
    blocks: BlockNodeInit[];
    /** Index to insert blocks at. If undefined, inserts at the end */
    index?: number;
    /** User id. Defaults to the current user id from the config */
    userId?: string | number;
  }): void;

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
   * @param params - getData parameters
   * @param params.block - index or id of the block
   * @param params.key - data key to get
   */
  getData<V = unknown>(params: {
    /** Index or id of the block */
    block: number | string;
    /** Data key to get */
    key: string;
  }): TextNodeSerialized | ValueSerialized<V> | undefined;

  /**
   * Removes data by the data key
   * @param params - removeData parameters
   * @param params.block - index or id of the block
   * @param params.key - data key to remove
   * @param [params.userId] - user id. Defaults to the current user id from the config
   */
  removeData(params: {
    /** Index or id of the block */
    block: number | string;
    /** Data key to remove */
    key: string;
    /** User id. Defaults to the current user id from the config */
    userId?: string | number;
  }): void;

  /**
   * Creates data node with the given key
   * @param params - createData parameters
   * @param params.block - index or id of the block
   * @param params.key - data key to create
   * @param [params.initialData] - optional initial data
   * @param [params.userId] - user id. Defaults to the current user id from the config
   */
  createData<V = unknown>(params: {
    /** Index or id of the block */
    block: number | string;
    /** Data key to create */
    key: string;
    /** Optional initial data */
    initialData?: TextNodeSerialized | ValueSerialized<V>;
    /** User id. Defaults to the current user id from the config */
    userId?: string | number;
  }): void;

  /**
   * Updates value by the given key
   * @param params - updateValue parameters
   * @param params.block - index or id of the block
   * @param params.key - data key to update
   * @param params.value - new value
   * @param [params.userId] - user id. Defaults to the current user id from the config
   */
  updateValue<V = unknown>(params: {
    /** Index or id of the block */
    block: number | string;
    /** Data key to update */
    key: string;
    /** New value */
    value: V;
    /** User id. Defaults to the current user id from the config */
    userId?: string | number;
  }): void;

  /**
   * Splits the block at the given data key and character offset.
   * If the tool supports splitting (canBeSplit = true) a new block of the same type is inserted after the current one.
   * Otherwise, the default block is inserted with the content after the caret.
   * @param params - method parameters (see comments in the type)
   */
  split(params: {
    /** Index or id of the block */
    block: number | string;
    /** Data key of the text input to split */
    key: string;
    /** Character offset within the text value to split at */
    offset: number;
    /** User id. Defaults to the current user id from the config */
    userId?: string | number;
  }): void;

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
