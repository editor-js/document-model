import type { Caret, EditorJSModel, CaretManagerEvents, Index } from '@editorjs/model';
import { getAbsoluteRangeOffset, getBoundaryPointByAbsoluteOffset, useSelectionChange } from '../utils/index.js';
import type { TextRange } from '@editorjs/model';
import { EventType, IndexBuilder } from '@editorjs/model';
import { isNativeInput } from '@editorjs/dom';

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
  #userCaret: Caret;

  /**
   * @class
   * @param container - Editor.js DOM container
   * @param model - Editor.js model
   */
  constructor(container: HTMLElement, model: EditorJSModel) {
    super();

    this.#model = model;
    this.#container = container;
    this.#userCaret = this.#model.createCaret();

    const { on } = useSelectionChange();

    on(container, (selection) => this.#onSelectionChange(selection), this);

    this.#model.addEventListener(EventType.CaretManagerUpdated, (event) => this.#onModelUpdate(event));
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
   */
  public updateIndex(index: Index): void {
    this.#userCaret.update(index);
  }

  /**
   * Selection change handler
   *
   * @param selection - new document selection
   */
  #onSelectionChange(selection: Selection | null): void {
    if (!selection) {
      return;
    }

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
   * @param event - model update event
   */
  #onModelUpdate(event: CaretManagerEvents): void {
    const { index } = event.detail;

    if (index === null) {
      return;
    }

    const { textRange } = index;

    if (textRange === undefined) {
      return;
    }

    const caretId = event.detail.id;

    if (caretId !== this.#userCaret.id) {
      return;
    }

    const builder = new IndexBuilder();

    /**
     * We need to remove text range from index to find related input by serialized index
     */
    builder.from(index).addTextRange(undefined);

    const input = this.#inputs.get(builder.build().serialize());

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
