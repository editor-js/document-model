import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import { TOKENS } from '../tokens.js';
import { BlocksManager } from '../components/BlockManager.js';
import { CoreConfigValidated } from '@editorjs/sdk';
import { BlocksAPI as BlocksApiInterface } from '@editorjs/sdk';
import {
  BlockId,
  BlockIndexOrId,
  createBlockId,
  createDataKey,
  EditorDocumentSerialized,
  EditorJSModel,
  TextNodeSerialized,
  ValueSerialized
} from '@editorjs/model';

/**
 * Blocks API
 *  - provides methods to work with blocks
 */
@injectable()
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
   * Model instance
   */
  #model: EditorJSModel;

  /**
   * BlocksAPI class constructor
   * @param blocksManager - BlocksManager instance to work with blocks
   * @param config - EditorJS configuration
   * @param model - EditorJS model instance
   */
  constructor(
    blocksManager: BlocksManager,
    @inject(TOKENS.EditorConfig) config: CoreConfigValidated,
    model: EditorJSModel
  ) {
    this.#blocksManager = blocksManager;
    this.#config = config;
    this.#model = model;
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
   * Removes Block by index or id, or current block if params are not passed
   * @param params - delete parameters
   * @param params.block - index or id of a block to delete
   * @param params.userId - user id to attribute the change to
   */
  public delete({ block, userId = this.#config.userId }: NonNullable<Parameters<BlocksApiInterface['delete']>[0]> = {}): void {
    return this.#blocksManager.deleteBlock(block, userId);
  }

  /**
   * Moves a block to a new index
   * @param params - move parameters
   * @param params.toIndex - index where the block is moved to
   * @param [params.fromIndex] - block to move. Current block if not passed
   * @param [params.userId] - user id to attribute the change to
   */
  public move({ toIndex, fromIndex, userId = this.#config.userId }: Parameters<BlocksApiInterface['move']>[0]): void {
    return this.#blocksManager.move(toIndex, fromIndex, userId);
  }

  /**
   * Returns Blocks count
   */
  public getBlocksCount(): number {
    return this.#blocksManager.blocksCount;
  }

  /**
   * Inserts several Blocks to specified index
   * @param params - insertMany parameters
   * @param params.blocks - array of blocks to insert
   * @param [params.index] - index to insert blocks at. If undefined, inserts at the end
   * @param [params.userId] - user id to attribute the change to
   */
  public insertMany({ blocks, index, userId = this.#config.userId }: Parameters<BlocksApiInterface['insertMany']>[0]): void {
    return this.#blocksManager.insertMany(blocks, index, userId);
  }

  /**
   * Inserts a new block to the editor
   * @param [params] - insert parameters
   * @param [params.type] - Block tool name to insert
   * @param [params.data] - Block's initial data
   * @param [params.index] - index to insert block at
   * @param [params.focus] - flag indicates if new block should be focused @todo implement
   * @param [params.replace] - flag indicates if block at index should be replaced @todo implement
   * @param [params.userId] - user id to attribute the change to
   */
  public insert({ type, data, index, focus, replace, userId = this.#config.userId }: NonNullable<Parameters<BlocksApiInterface['insert']>[0]> = {}): void {
    const blockType = type ?? this.#config.defaultBlock;
    const blockData = data ?? {};

    this.#blocksManager.insert({
      type: blockType,
      data: blockData,
      index,
      replace,
      focus,
      userId,
    });
  };

  /**
   * Returns block's index by its id
   * @param id - block id to get index for
   */
  public getIndexById(id: string): number {
    return this.#model.getBlockIndexById(createBlockId(id));
  }

  /**
   * Returns block id by its index
   * @param index - block index to get id for
   */
  public getIdByIndex(index: number): BlockId | undefined {
    return this.#model.getBlockId(index);
  }

  /**
   * Returns serialized data for provided data key
   * @param params - getData parameters
   * @param params.block - index or id of the block
   * @param params.key - data key to get serialized data for
   */
  public getData<V = unknown>({ block, key }: Parameters<BlocksApiInterface['getData']>[0]): TextNodeSerialized | ValueSerialized<V> | undefined {
    return this.#model.getDataNode<V>(block as BlockIndexOrId, key) as TextNodeSerialized | ValueSerialized<V> | undefined;
  }

  /**
   * Creates data node with the given key
   * @param params - createData parameters
   * @param params.block - index or id of the block
   * @param params.key - data key of the new data node
   * @param [params.initialData] - optional initial data
   * @param [params.userId] - user id to attribute the change to
   */
  public createData({ block, key, initialData, userId = this.#config.userId }: Parameters<BlocksApiInterface['createData']>[0]): void {
    this.#model.createDataNode(
      userId,
      block as BlockIndexOrId,
      key,
      initialData
    );
  }

  /**
   * Removes data by the data key
   * @param params - removeData parameters
   * @param params.block - index or identifier of the block
   * @param params.key - data key of the node to remove
   * @param [params.userId] - user id to attribute the change to
   */
  public removeData({ block, key, userId = this.#config.userId }: Parameters<BlocksApiInterface['removeData']>[0]): void {
    this.#model.removeDataNode(userId, block as BlockIndexOrId, key);
  }

  /**
   * Updates value by the given key
   * @param params - updateValue parameters
   * @param params.block - index or identifier of the block
   * @param params.key - key of the data node to update
   * @param params.value - new value
   * @param [params.userId] - user id to attribute the change to
   */
  public updateValue({ block, key, value, userId = this.#config.userId }: Parameters<BlocksApiInterface['updateValue']>[0]): void {
    this.#model.updateValue(userId, block as BlockIndexOrId, createDataKey(key), value);
  }

  /**
   * Splits the block at the given data key and character offset.
   * Delegates to BlocksManager.splitBlock.
   * @param params - split parameters
   * @param params.block - index or id that locates the block
   * @param params.key - data key of the text input at which to split
   * @param params.offset - character offset within the text value to split at
   * @param [params.userId] - user id to attribute the change to
   */
  public split({ block, key, offset, userId }: Parameters<BlocksApiInterface['split']>[0]): void {
    this.#blocksManager.splitBlock(block as BlockIndexOrId, createDataKey(key), offset, userId);
  }

  /**
   * Converts a block to a new type
   * @param params - conversion parameters
   * @param params.block - index or id of the block to convert
   * @param params.key - data key of the text input at which to convert
   * @param params.newType - block tool name to convert to
   * @param [params.dataOverrides] - optional data overrides for the new block. Merged shallowly:
   *   object-valued keys are replaced wholesale, not deep-merged.
   * @param [params.userId] - user id to attribute the change to
   */
  public convert({
    block,
    key,
    newType,
    dataOverrides,
    userId = this.#config.userId,
  }: Parameters<BlocksApiInterface['convert']>[0]): void {
    this.#blocksManager.convertBlock(block as BlockIndexOrId, createDataKey(key), newType, userId, dataOverrides);
  }
}
