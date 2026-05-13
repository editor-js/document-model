import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import { TOKENS } from '../tokens.js';
import { BlocksManager } from '../components/BlockManager.js';
import { BlockToolData } from '@editorjs/editorjs';
import { CoreConfigValidated } from '@editorjs/sdk';
import { BlocksAPI as BlocksApiInterface } from '@editorjs/sdk';
import {
  BlockId, BlockIndexOrId,
  type BlockNodeInit,
  createBlockId, createDataKey,
  type EditorDocumentSerialized,
  EditorJSModel,
  TextNodeSerialized, ValueSerialized
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
  public insertMany(blocks: BlockNodeInit[], index?: number): void {
    return this.#blocksManager.insertMany(blocks, index);
  }

  /**
   * Inserts a new block to the editor
   * @param type - Block tool name to insert
   * @param data - Block's initial data
   * @param index - index to insert block at
   * @param focus - flag indicates if new block should be focused @todo implement
   * @param replace - flag indicates if block at index should be replaced @todo implement
   * @param id - id of the inserted block @todo implement
   */
  public insert(
    type?: string,
    data?: BlockToolData,
    index?: number,
    focus?: boolean,
    replace?: boolean,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    id?: string
  ): void {
    const blockType = type ?? this.#config.defaultBlock;
    const blockData = data ?? {};

    this.#blocksManager.insert({
      type: blockType,
      data: blockData,
      index,
      replace,
      focus,
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
   * @param blockIndexOrId - index or identifier of the block
   * @param dataKey - data key to get serialized data for
   */
  public getData<V = unknown>(blockIndexOrId: number | string, dataKey: string): TextNodeSerialized | ValueSerialized<V> | undefined {
    /**
     * Need an explicit cast here because TS doesn't pass generic for some reason
     */
    return this.#model.getDataNode<V>(blockIndexOrId as BlockIndexOrId, dataKey) as TextNodeSerialized | ValueSerialized<V> | undefined;
  }

  /**
   * Creates data node with the given key
   * @param indexOrId - index or id of the block
   * @param dataKey - data key of the new data node
   * @param [initialData] - optional initial data
   */
  public createData<V = unknown>(
    indexOrId: number | string,
    dataKey: string,
    initialData?: TextNodeSerialized | ValueSerialized<V>
  ): void {
    this.#model.createDataNode(
      this.#config.userId,
      indexOrId as BlockIndexOrId,
      dataKey,
      initialData
    );
  }

  /**
   * Removes data by the data key
   * @param blockIndexOrId - index or identifier of the block
   * @param dataKey - data key of the node to remove
   */
  public removeData(blockIndexOrId: string | number, dataKey: string): void {
    this.#model.removeDataNode(this.#config.userId, blockIndexOrId as BlockIndexOrId, dataKey);
  }

  /**
   * Updates value by the given key
   * @param blockIndexOrId - index or identifier of the block
   * @param dataKey - key of the data node to update
   * @param value - new value
   */
  public updateValue<V = unknown>(blockIndexOrId: string | number, dataKey: string, value: V): void {
    this.#model.updateValue(this.#config.userId, blockIndexOrId as BlockIndexOrId, createDataKey(dataKey), value);
  }
}
