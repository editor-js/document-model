import { isNativeInput } from '@editorjs/dom';
import type {
  ModelEvents } from '@editorjs/model';
import {
  BlockRemovedEvent,
  type Caret,
  type CaretManagerEvents,
  type EditorJSModel,
  EventType,
  Index,
  IndexBuilder,
  type TextRange,
  createDataKey
} from '@editorjs/model';
import type { CoreConfig } from '@editorjs/sdk';
import { getAbsoluteRangeOffset, getBoundaryPointByAbsoluteOffset, useSelectionChange } from '../utils/index.js';
import type { BlockToolAdapter } from '../BlockToolAdapter/index.ts';

/**
 * Caret adapter watches selection change and saves it to the model
 *
 * On model update, it updates the selection in the DOM
 */
export class CaretAdapter extends EventTarget {
  /**
   * Editor.js DOM container
   */
  #container: HTMLElement;

  /**
   * Editor.js model
   */
  #model: EditorJSModel;

  /**
   * We store blocks in caret adapter to give it access to blocks` inputs
   * without additional storing inputs in the caret adapter
   * Thus, it won't care about block index change (block removed, block added, block moved)
   */
  #blocks: Array<BlockToolAdapter> = [];

  /**
   * Current user's caret
   */
  #currentUserCaret: Caret;

  /**
   * Map with users' carets by userId
   */
  #userCarets = new Map<string | number, Caret>();

  /**
   * Editor's config
   */
  #config: Required<CoreConfig>;

  /**
   * @class
   * @param config - Editor's config
   * @param container - Editor.js DOM container
   * @param model - Editor.js model
   */
  constructor(config: Required<CoreConfig>, container: HTMLElement, model: EditorJSModel) {
    super();

    this.#config = config;
    this.#model = model;
    this.#container = container;
    this.#currentUserCaret = this.#model.createCaret(this.#config.userId);
    this.#userCarets.set(this.#config.userId, this.#currentUserCaret);

    const { on } = useSelectionChange();

    /**
     * @todo Unsubscribe on adapter destruction
     */
    on(container, (selection) => this.#onSelectionChange(selection), this);

    this.#model.addEventListener(EventType.CaretManagerUpdated, (event) => this.#onModelCaretUpdate(event));
    this.#model.addEventListener(EventType.Changed, (event: ModelEvents) => this.#handleModelUpdate(event));
  }

  /**
   * Getter for internal caret index of the user
   */
  public get userCaretIndex(): Index | null {
    return this.#currentUserCaret.index;
  }

  /**
   * Adds block to the caret adapter
   *
   * @param block - block tool adapter
   */
  public attachBlock(block: BlockToolAdapter): void {
    this.#blocks.push(block);
  }

  /**
   * Removes block from the caret adapter
   *
   * @param index - index of the block to remove
   */
  public detachBlock(index: Index): void {
    const block = this.getBlock(index);

    if (block) {
      const blockIndex = this.#blocks.indexOf(block);

      if (blockIndex !== -1) {
        this.#blocks.splice(blockIndex, 1);
      }
    }
  }

  /**
   * Updates current user's caret index
   *
   * @param index - new caret index
   * @param [userId] - user identifier
   */
  public updateIndex(index: Index | null, userId?: string | number): void {
    if (userId === undefined) {
      this.#currentUserCaret.update(index);

      return;
    }


    const caretToUpdate = this.#userCarets.get(userId);

    if (caretToUpdate === undefined) {
      return;
    }

    caretToUpdate.update(index);
  }

  /**
   * Finds block by index
   *
   * @param index - index of the block in the model tree
   */
  public getBlock(index?: Index): BlockToolAdapter | undefined {
    if (index === undefined) {
      if (this.#currentUserCaret.index === null) {
        throw new Error('[CaretManager] No index provided and no user caret index found');
      }
      index = this.#currentUserCaret.index;
    }

    const blockIndex = index.blockIndex;

    if (blockIndex === undefined) {
      return undefined;
    }

    return this.#blocks.find(block => block.getBlockIndex().blockIndex === blockIndex);
  }

  /**
   * Finds input by block index and data key
   *
   * @param blockIndex - index of the block
   * @param dataKeyRaw - data key of the input
   * @returns input element or undefined if not found
   */
  public findInput(blockIndex: number, dataKeyRaw: string): HTMLElement | undefined {
    const builder = new IndexBuilder();

    builder.addBlockIndex(blockIndex);
    const block = this.getBlock(builder.build());

    if (!block) {
      return undefined;
    }

    const dataKey = createDataKey(dataKeyRaw);

    return block.getInput(dataKey);
  }

  /**
   * Selection change handler
   *
   * @param selection - new document selection
   */
  #onSelectionChange(selection: Selection | null): void {
    if (!selection) {
      this.updateIndex(null);

      return;
    }

    /**
     * @todo Think of cross-block selection
     */
    const activeElement = document.activeElement;

    for (const block of this.#blocks) {
      const inputs = block.getAttachedInputs();

      for (const [key, input] of inputs.entries()) {
        if (input !== activeElement) {
          continue;
        }

        if (isNativeInput(input) === true) {
          const textRange = [
            (input as HTMLInputElement | HTMLTextAreaElement).selectionStart,
            (input as HTMLInputElement | HTMLTextAreaElement).selectionEnd,
          ] as TextRange;

          const builder = new IndexBuilder();

          builder
            .from(block.getBlockIndex())
            .addDataKey(key)
            .addTextRange(textRange);

          this.updateIndex(builder.build());

          /**
           * For now we handle only first found input
           */
          break;
        }

        const range = selection.getRangeAt(0);

        /**
         * @todo think of cross-block selection
         */
        const textRange = [
          getAbsoluteRangeOffset(input, range.startContainer, range.startOffset),
          getAbsoluteRangeOffset(input, range.endContainer, range.endOffset),
        ] as TextRange;

        const builder = new IndexBuilder();

        builder
          .from(block.getBlockIndex())
          .addDataKey(key)
          .addTextRange(textRange);

        this.updateIndex(builder.build());

        /**
         * For now we handle only first found input
         */
        break;
      }
    }
  }

  /**
   * Model updates handler
   *
   * - Finds input to set selection to by serialized index
   * - If current user's selection is different, set the one from the update
   *
   * @param event - model update event
   */
  #onModelCaretUpdate(event: CaretManagerEvents): void {
    const { index: serializedIndex } = event.detail;

    if (serializedIndex === null) {
      return;
    }

    const index = Index.parse(serializedIndex);
    const { textRange, dataKey } = index;

    if (textRange === undefined || dataKey === undefined) {
      return;
    }

    const userId = event.detail.userId;

    if (userId !== this.#currentUserCaret.userId) {
      return;
    }

    const block = this.getBlock(index);

    if (!block) {
      return;
    }

    const input = block.getInput(dataKey);

    if (!input) {
      return;
    }

    if (isNativeInput(input) === true) {
      const currentStart = (input as HTMLInputElement | HTMLTextAreaElement).selectionStart;
      const currentEnd = (input as HTMLInputElement | HTMLTextAreaElement).selectionEnd;

      /**
       * If selection is already the same, we don't need to update it to not interrupt browser's behaviour
       */
      if (currentStart === textRange[0] && currentEnd === textRange[1]) {
        return;
      }

      (input as HTMLInputElement | HTMLTextAreaElement).selectionStart = textRange[0];
      (input as HTMLInputElement | HTMLTextAreaElement).selectionEnd = textRange[1];

      return;
    }

    const selection = document.getSelection()!;

    let isStartEqualsCurrent = false;
    let isEndEqualsCurrent = false;

    const start = getBoundaryPointByAbsoluteOffset(input, textRange[0]);
    const end = getBoundaryPointByAbsoluteOffset(input, textRange[1]);

    /**
     * If selection is outside of the input, it is different from the model range
     */
    if (input.contains(selection.anchorNode!) && input.contains(selection.focusNode!)) {
      let absoluteStartOffset = getAbsoluteRangeOffset(input, selection.anchorNode!, selection.anchorOffset);
      let absoluteEndOffset = getAbsoluteRangeOffset(input, selection.focusNode!, selection.focusOffset);

      /**
       * For right-to-left selection, we need to swap start and end offsets to compare with model range
       */
      if (absoluteStartOffset > absoluteEndOffset) {
        [absoluteStartOffset, absoluteEndOffset] = [absoluteEndOffset, absoluteStartOffset];
      }

      isStartEqualsCurrent = textRange[0] === absoluteStartOffset;
      isEndEqualsCurrent = textRange[1] === absoluteEndOffset;
    }

    /**
     * If selection is already the same, we don't need to update it to not interrupt browser's behaviour
     */
    if (isStartEqualsCurrent && isEndEqualsCurrent) {
      return;
    }

    const range = new Range();

    range.setStart(...start);
    range.setEnd(...end);

    selection.removeAllRanges();
    selection.addRange(range);
  }

  /**
   * Handles model update events
   *
   * @param event - model update event
   */
  #handleModelUpdate(event: ModelEvents): void {
    /**
     * When block is removed, we need to remove it from this.#blocks
     */
    if (event instanceof BlockRemovedEvent) {
      const removedBlockIndex = event.detail.index.blockIndex;

      if (removedBlockIndex === undefined) {
        return;
      }

      /**
       * Find all blocks that match the removed block index
       */
      const blocksToRemove = this.#blocks.find(block => block.getBlockIndex().blockIndex === removedBlockIndex);

      if (blocksToRemove) {
        this.detachBlock(blocksToRemove.getBlockIndex());
      }
    }
  }
}
