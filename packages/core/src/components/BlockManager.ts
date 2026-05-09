import {
  BlockChildType,
  type BlockId,
  type BlockNodeInit,
  type DataKey,
  type EditorDocumentSerialized,
  EditorJSModel,
  type InlineTreeNodeSerialized,
  keypath,
  mergeTextNodes,
  NODE_TYPE_HIDDEN_PROP,
  sliceFragments
} from '@editorjs/model';
import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import { TOKENS } from '../tokens.js';
import ToolsManager from '../tools/ToolsManager.js';
import { BlockToolData } from '@editorjs/editorjs';
import { CoreConfigValidated, EventBus } from '@editorjs/sdk';

/**
 * Parameters for the BlocksManager.insert() method
 */
interface InsertBlockParameters {
  /**
   * Block ID
   */
  id?: string;
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
    id = undefined,
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
      id,
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
  public insertMany(blocks: BlockNodeInit[], index: number = this.#model.length): void {
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

    const block = this.#model.getBlockSerialized(fromIndex);

    this.#model.removeBlock(this.#config.userId, fromIndex);
    this.#model.addBlock(this.#config.userId, block, toIndex);
  }

  /**
   * Splits a block at the given data key and offset.
   * If the tool has canSplit = true, a new block of the same type is inserted after,
   * with data taken from the inputs after the caret; array-indexed keys are renumbered from 0.
   * Otherwise, the default block is inserted with the extracted text content merged together.
   * @param blockIndexOrId - numeric position or named identifier that locates the block
   * @param dataKey - the data key at which the split is performed
   * @param offset - character offset within the data key's text value to split at
   */
  public splitBlock(blockIndexOrId: number | BlockId, dataKey: DataKey, offset: number): void {
    const blockIndex = this.#model.resolveBlockIndex(blockIndexOrId);

    const block = this.#model.getBlockSerialized(blockIndex);
    const toolName = block.name;

    const tool = this.#toolsManager.blockTools.get(toolName);
    const canSplit = tool?.options.canSplit === true;

    const blockTextContent = Object.entries(
      this.#model.getBlockTextContent(blockIndex)
    );

    const splitIndex = blockTextContent.findIndex(([key]) => key === dataKey);

    if (splitIndex === -1) {
      throw new Error(`Data key "${dataKey}" not found in block content`);
    }

    const [, splitInput] = blockTextContent[splitIndex];

    if (offset < 0 || offset > splitInput.value.length) {
      throw new RangeError(
        `Offset ${offset} is out of range for input "${dataKey}" with length ${splitInput.value.length}`
      );
    }

    /**
     * Text and fragments from the input that was split
     */
    const textAfter = splitInput.value.slice(offset);
    const fragmentsAfter = sliceFragments(splitInput.fragments, offset);
    const entriesAfter = blockTextContent.slice(splitIndex + 1);

    /**
     * If split happens at the beginning of the first input - just insert an empty block before
     */
    if (offset === 0 && splitIndex === 0) {
      this.#model.addBlock(
        this.#config.userId,
        {
          name: canSplit ? block.name : this.#config.defaultBlock,
          data: {},
        },
        blockIndex
      );

      return;
    }

    /**
     * Remove text in the split input (fragments will be adjusted by the model)
     */
    if (offset < splitInput.value.length) {
      this.#model.removeText(this.#config.userId, blockIndex, dataKey, offset);
    }

    /**
     * Remove all the inputs in the current block after the split
     */
    entriesAfter.forEach(([key]) => {
      this.#model.removeDataNode(this.#config.userId, blockIndex, key);
    });

    /**
     * In case the split is at the end of the last input, just add a new block
     */
    if (offset === splitInput.value.length && splitIndex === blockTextContent.length - 1) {
      this.#model.addBlock(
        this.#config.userId,
        {
          name: canSplit ? block.name : this.#config.defaultBlock,
          data: {},
        },
        blockIndex + 1
      );

      return;
    }

    /**
     * If block doesn't support splitting into two, insert a new default block utilizing its conversionConfig.import to get the data
     * @todo on initialization validate defaultTool must have conversionConfig.import
     */
    if (!canSplit) {
      const contentAfterAccInit: InlineTreeNodeSerialized = {
        /**
         * @todo check if \n is a proper option here
         */
        value: textAfter + '\n',
        fragments: fragmentsAfter,
      };

      const contentAfter = mergeTextNodes(entriesAfter, contentAfterAccInit);

      const defaultTool = this.#toolsManager.blockTools.get(this.#config.defaultBlock)!;

      const newBlockData = defaultTool.importTextContent(contentAfter.value, contentAfter.fragments);

      /**
       * Insert new block with the content after the caret, converted using the default block's import method
       */
      this.#model.addBlock(this.#config.userId, {
        name: this.#config.defaultBlock,
        data: newBlockData,
      }, blockIndex + 1);

      return;
    }

    /**
     * In case Tool supports splitting into two blocks, extract inputs after the split and add new block with the extracted data
     */
    const newData: Record<string, unknown> = {};

    /**
     * Need to add split input to properly renumber array indexes
     */
    entriesAfter.unshift([dataKey as string, {
      value: textAfter,
      fragments: fragmentsAfter,
      [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text as BlockChildType.Text,
    }]);

    if (entriesAfter.length > 0) {
      /**
       * In case data contains an array, we need to renumber the keys to start from 0
       */
      const renumbered = keypath.renumberKeys(entriesAfter.map(([key]) => key));

      entriesAfter.forEach(([key, content]) => {
        keypath.set(newData, renumbered.get(key) ?? key, content);
      });
    }

    this.#model.addBlock(this.#config.userId, {
      name: toolName,
      data: newData,
    }, blockIndex + 1);
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
