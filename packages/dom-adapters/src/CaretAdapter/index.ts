import { isNativeInput } from '@editorjs/dom';
import {
  BlockAddedEvent,
  BlockRemovedEvent,
  type Caret,
  type CaretManagerEvents,
  type EditorJSModel,
  EventAction,
  EventType,
  Index,
  IndexBuilder,
  type ModelEvents,
  TextAddedEvent,
  type TextRange,
  TextRemovedEvent
} from '@editorjs/model';
import type { CoreConfig } from '@editorjs/sdk';
import { getAbsoluteRangeOffset, getBoundaryPointByAbsoluteOffset, useSelectionChange } from '../utils/index.js';

/**
 * Caret adapter watches selection change and saves it to the model
 *
 * On model update, it updates the selection in the DOM
 */
export class CaretAdapter extends EventTarget {
  /**
   * Editor.js DOM container
   *
   * @private
   */
  #container: HTMLElement;

  /**
   * Editor.js model
   *
   * @private
   */
  #model: EditorJSModel;

  /**
   * Map of inputs
   *
   * @private
   */
  #inputs = new Map<string, HTMLElement>();

  /**
   * Current user's caret
   *
   * @private
   */
  #currentUserCaret: Caret;

  #userCarets = new Map<string | number, Caret>();

  /**
   * Editor's config
   */
  #config: CoreConfig;

  /**
   * @class
   * @param config - Editor's config
   * @param container - Editor.js DOM container
   * @param model - Editor.js model
   */
  constructor(config: CoreConfig, container: HTMLElement, model: EditorJSModel) {
    super();

    this.#config = config;
    this.#model = model;
    this.#container = container;
    this.#currentUserCaret = this.#model.createCaret(this.#config.userId!);
    this.#userCarets.set(this.#config.userId!, this.#currentUserCaret);

    const { on } = useSelectionChange();

    /**
     * @todo Unsubscribe on adapter destruction
     */
    on(container, (selection) => this.#onSelectionChange(selection), this);

    this.#model.addEventListener(EventType.CaretManagerUpdated, (event) => this.#onModelUpdate(event));
  }

  /**
   * Getter for internal caret index of the user
   */
  public get userCaretIndex(): Index | null {
    return this.#currentUserCaret.index;
  }

  /**
   * Adds input to the caret adapter
   *
   * @param input - input element
   * @param index - index of the input in the model tree
   */
  public attachInput(input: HTMLElement, index: Index): void {
    this.#inputs.set(index.serialize(), input);
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

    if (!caretToUpdate) {
    }

    caretToUpdate.update(index);
  }

  /**
   * Shifts current user's caret by the model event not from the current user
   *E.g. if another user inserts a character before the current user's caret, we need to update the caret
   *
   * @param event - model event to update caret by
   */
  public shiftIndexByModelEvent(event: ModelEvents): void {
    const caretIndex = this.userCaretIndex;

    if (caretIndex === null) {
      return;
    }

    const newIndex = new IndexBuilder().from(caretIndex);
    const index = event.detail.index;

    switch (true) {
      case (event instanceof TextAddedEvent):
      case (event instanceof TextRemovedEvent): {
        if (index.blockIndex !== caretIndex.blockIndex || index.dataKey !== caretIndex.dataKey) {
          return;
        }

        if (index.textRange![0] > caretIndex.textRange![0]) {
          return;
        }

        const delta = event.detail.data.length * (event.detail.action === EventAction.Added ? 1 : -1);

        newIndex.addTextRange([caretIndex.textRange![0] + delta, caretIndex.textRange![1] + delta]);

        break;
      }

      case (event instanceof BlockRemovedEvent):
      case (event instanceof BlockAddedEvent): {
        if (index.blockIndex! > caretIndex.blockIndex!) {
          return;
        }

        newIndex.addBlockIndex(caretIndex.blockIndex! + (event.detail.action === EventAction.Added ? 1 : -1));

        break;
      }

      default:
        return;
    }

    this.updateIndex(newIndex.build());
  }

  /**
   * Finds input by index
   *
   * @param index - index of the input in the model tree
   */
  public getInput(index?: Index): HTMLElement | undefined {
    const builder = new IndexBuilder();


    if (index !== undefined) {
      builder.from(index);
    } else if (this.#currentUserCaret.index !== null) {
      builder.from(this.#currentUserCaret.index);
    } else {
      throw new Error('[CaretManager] No index provided and no user caret index found');
    }

    /**
     * Inputs are stored in the hashmap with serialized index as a key
     * Those keys are serialized without document id and text range to cover the input only, so we need to remove them here to find the input
     */
    builder.addDocumentId(undefined);
    builder.addTextRange(undefined);

    return this.#inputs.get(builder.build().serialize());
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

    for (const [index, input] of this.#inputs) {
      if (input !== activeElement) {
        continue;
      }

      if (isNativeInput(input) === true) {
        const textRange = [
          (input as HTMLInputElement | HTMLTextAreaElement).selectionStart,
          (input as HTMLInputElement | HTMLTextAreaElement).selectionEnd,
        ] as TextRange;

        const builder = new IndexBuilder();

        builder.from(index).addTextRange(textRange);

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

      builder.from(index).addTextRange(textRange);

      this.updateIndex(builder.build());

      /**
       * For now we handle only first found input
       */
      break;
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
  #onModelUpdate(event: CaretManagerEvents): void {
    const { index: serializedIndex } = event.detail;

    if (serializedIndex === null) {
      return;
    }

    const index = Index.parse(serializedIndex);

    const { textRange } = index;

    if (textRange === undefined) {
      return;
    }

    const userId = event.detail.userId;

    if (userId !== this.#currentUserCaret.userId) {
      return;
    }

    const input = this.getInput(index);

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
    const currentRange = selection.getRangeAt(0);

    const start = getBoundaryPointByAbsoluteOffset(input, textRange[0]);
    const end = getBoundaryPointByAbsoluteOffset(input, textRange[1]);

    const isStartEqualsCurrent = start[0] === currentRange.startContainer && start[1] === currentRange.startOffset;
    const isEndEqualsCurrent = end[0] === currentRange.endContainer && end[1] === currentRange.endOffset;

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
}
