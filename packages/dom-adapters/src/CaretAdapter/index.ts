import { useSelectionChange } from '../caret/utils/useSelectionChange.js';
import type { Caret, EditorJSModel, CaretManagerEvents, Index } from '@editorjs/model';
import { getAbsoluteRangeOffset, getBoundaryPointByAbsoluteOffset, isNativeInput } from '../utils/index.js';
import type { TextRange } from '@editorjs/model';
import { EventType, IndexBuilder } from '@editorjs/model';

/**
 *
 */
export class CaretAdapter extends EventTarget {
  #container: HTMLElement;
  #model: EditorJSModel;
  #inputs = new Map<string, HTMLElement>();
  #userCaret: Caret;

  /**
   *
   * @param container
   * @param model
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
   *
   * @param input
   * @param index
   */
  public attachInput(input: HTMLElement, index: Index): void {
    this.#inputs.set(index.serialize(), input);
  }

  /**
   *
   * @param index
   */
  public updateIndex(index: Index): void {
    this.#userCaret.update(index);
  }

  /**
   *
   * @param selection
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

      if (isNativeInput(input)) {
        const textRange = [
          input.selectionStart,
          input.selectionEnd,
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
   *
   * @param event
   */
  #onModelUpdate(event: CaretManagerEvents): void {
    const { index } = event.detail;

    if (!index) {
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

    const input = this.#inputs.get(index.serialize());

    if (!input) {
      return;
    }

    if (isNativeInput(input)) {
      input.selectionStart = textRange[0];
      input.selectionEnd = textRange[1];

      return;
    }

    const start = getBoundaryPointByAbsoluteOffset(input, textRange[0]);
    const end = getBoundaryPointByAbsoluteOffset(input, textRange[1]);

    const selection = document.getSelection()!;
    const range = new Range();

    range.setStart(...start);
    range.setEnd(...end);

    selection.removeAllRanges();

    selection.addRange(range);
  }
}
