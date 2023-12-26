import type { DataKey, EditorJSModel, TextRange, Caret, TextIndex, CaretUpdatedEvent } from '@editorjs/model';
import { useSelectionChange, type Subscriber, type InputWithCaret } from './utils/useSelectionChange.js';
import { getAbsoluteRangeOffset, getRelativeRangeIndex } from '../utils/index.js';
import { EventType } from '@editorjs/model';

/**
 * Caret adapter watches input caret change and passes it to the model
 *
 * - subscribe on input caret change
 * - compose caret index by selection position related to start of input
 * - pass caret position to model —  model.updateCaret()
 * - subscribe on model's ‘caret change’ event (index) => {}), by filtering events only related with current input and set caret position
 *
 * @todo make CaretAdapter a global instance
 * @todo add support for native inputs
 * @todo debug problem when document "selectionchange" is not fired on Enter press
 * @todo debug problem when offset at the end of line and at the beginning of the next line is the same
 */
export class CaretAdapter extends EventTarget {
  /**
   * Index stores start and end offset of a caret depending on a root of input
   */
  #index: TextRange | null = null;

  /**
   * Input element
   */
  #input: null | InputWithCaret = null;

  /**
   * Current caret instance
   */
  #caret: Caret;

  /**
   * EditorJSModel instance
   */
  #model: EditorJSModel;

  /**
   * Index of a block that contains input
   */
  #blockIndex: number;

  /**
   * Method for subscribing on document selection change
   */
  #onSelectionChange: (input: InputWithCaret, callback: Subscriber['callback'], context: Subscriber['context']) => void;

  /**
   * Method for unsubscribing from document selection change
   */
  #offSelectionChange: (input: InputWithCaret) => void;

  #dataIndex: DataKey;

  /**
   * CaretAdapter constructor
   *
   * @param input - input element to attach caret adapter to
   * @param model - EditorJSModel instance
   * @param blockIndex - index of a block that contains input
   * @param dataIndex - data key to attach input to
   */
  constructor(input: HTMLElement, model: EditorJSModel, blockIndex: number, dataIndex: DataKey) {
    super();

    this.#input = input;
    this.#model = model;
    this.#blockIndex = blockIndex;
    this.#dataIndex = dataIndex;
    this.#caret = this.#model.createCaret();

    const {
      on,
      off,
    } = useSelectionChange();

    this.#onSelectionChange = on;
    this.#offSelectionChange = off;

    this.#model.addEventListener(EventType.CaretUpdated, this.#onModelUpdate.bind(this));

    this.#onSelectionChange(this.#input, this.#onInputSelectionChange, this);
  }

  /**
   * Unsubscribes from input caret change
   */
  public destruct(): void {
    if (!this.#input) {
      return;
    }

    this.#offSelectionChange(this.#input);
    this.#input = null;
  }

  /**
   * Callback that will be called on document selection change
   *
   * @param selection - changed document selection
   */
  #onInputSelectionChange(selection: Selection | null): void {
    this.#updateIndex(selection);
  };

  /**
   * Updates caret index in the model
   *
   * @param index - caret index
   */
  public updateIndex(index: TextRange): void {
    this.#caret.update([index, this.#dataIndex, this.#blockIndex] as TextIndex);
  }

  /**
   * Updates caret index form selection
   *
   * @param selection - changed document selection
   */
  #updateIndex(selection: Selection | null): void {
    const range = selection?.getRangeAt(0);

    if (!range || !this.#input) {
      return;
    }

    this.#index = [
      getAbsoluteRangeOffset(this.#input, range.startContainer, range.startOffset),
      getAbsoluteRangeOffset(this.#input, range.endContainer, range.endOffset),
    ] as TextRange;

    this.updateIndex(this.#index);
  }

  /**
   * Handles model's caret update event
   *
   * @param event - model's caret update event
   */
  #onModelUpdate(event: CaretUpdatedEvent): void {
    if (event.detail.index === null) {
      return;
    }

    const [textIndex, dataIndex, blockIndex] = event.detail.index as TextIndex;
    const caretId = event.detail.id;


    if (caretId !== this.#caret.id) {
      /**
       * @todo handle other carets
       */
      return;
    }

    if (blockIndex !== this.#blockIndex) {
      return;
    }

    if (dataIndex !== this.#dataIndex) {
      return;
    }

    if (textIndex[0] === this.#index?.[0] && textIndex[1] === this.#index?.[1]) {
      return;
    }

    const start = getRelativeRangeIndex(this.#input!, textIndex[0]);
    const end = getRelativeRangeIndex(this.#input!, textIndex[1]);

    const selection = document.getSelection()!;
    const range = new Range();

    range.setStart(...start);
    range.setEnd(...end);

    selection.removeAllRanges();

    selection.addRange(range);
  }
}
