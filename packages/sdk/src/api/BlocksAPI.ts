import type { BlockToolData } from 'editorjs-v2';
import type {
  BlockId,
  BlockNodeInit,
  DocumentData,
  PluginDataSerialized,
  TextNodeSerialized,
  ValueSerialized
} from '@editorjs/model-types';
import type { PluginDataFor, PluginId } from '../index.js';

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
   * @param [params.plugins] - initial per-plugin data for the block, keyed by plugin name
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
    /** Initial per-plugin data for the block, keyed by plugin name */
    plugins?: Record<string, PluginDataSerialized>;
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
   * Returns the name of the tool rendering the block at the given index, or undefined when no
   * block is there.
   *
   * Exists so that a caller needing one scalar about one block is not pushed to
   * `api.document.data`, which serializes the entire document to get there
   * @param index - index of the block
   */
  getToolByIndex(index: number): string | undefined;

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
   * Returns the per-block data stored by the given plugin, or undefined when it stores none.
   *
   * The data type is resolved from `EditorjsPluginDataMap` for a plugin that declares its shape,
   * and falls back to a plain record otherwise.
   * @param params - getPluginData parameters
   * @param params.block - index or id of the block
   * @param params.plugin - name the data is stored under, by convention the plugin's `name`
   */
  getPluginData<Id extends PluginId>(params: {
    /** Index or id of the block */
    block: number | string;
    /** Name the data is stored under */
    plugin: Id;
  }): PluginDataFor<Id> | undefined;

  /**
   * Merges the passed keys into the per-block data of the given plugin, creating the entry when
   * the block has none yet; a key set to `undefined` is removed. Each key is recorded as its own
   * modification, so writing several keys is not a single undo step.
   * @param params - updatePluginData parameters
   * @param params.block - index or id of the block
   * @param params.plugin - name the data is stored under, by convention the plugin's `name`
   * @param params.data - keys to merge into the plugin's data
   * @param [params.userId] - user id. Defaults to the current user id from the config
   */
  updatePluginData<Id extends PluginId>(params: {
    /** Index or id of the block */
    block: number | string;
    /** Name the data is stored under */
    plugin: Id;
    /** Keys to merge into the plugin's data */
    data: Partial<PluginDataFor<Id>>;
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
   */
  // update(id: string, data?: Partial<BlockToolData>): Promise<BlockAPI>;

  /**
   * Converts block to another type. Both blocks should provide the conversionConfig.
   * @param params.block - index or id of the block to convert. Should provide 'conversionConfig.export' method
   * @param params.key - data key of the text input at which to split
   * @param params.newType - new block type. Should provide 'conversionConfig.import' method
   * @param [params.dataOverrides] - optional data overrides for the new block. Merged shallowly:
   *   object-valued keys are replaced wholesale, not deep-merged.
   * @param [params.userId] - user id to attribute the change to
   * @throws Error if conversion is not possible
   */
  // @todo return BlockAPI when it is implemented
  convert(params: {
    /** Index or id of the block to convert */
    block: number | string;
    /** Data key of the text input to split */
    key: string;
    /** Block tool name to convert to */
    newType: string;
    /** Optional data overrides for the new block. Merged shallowly: object-valued keys are replaced wholesale, not deep-merged. */
    dataOverrides?: BlockToolData;
    /** User id. Defaults to the current user id from the config */
    userId?: string | number;
  }): void;
}
