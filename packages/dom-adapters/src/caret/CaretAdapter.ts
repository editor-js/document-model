import type { EditorJSModel, TextRange } from '@editorjs/model';
import { useSelectionChange, type Subscriber, type InputWithCaret  } from './utils/useSelectionChange.js';
import { getAbsoluteRangeOffset } from './utils/absoluteOffset.js';

/**
 * Caret adapter watches input caret change and passes it to the model
 *
 * - subscribe on input caret change
 * - compose caret index by selection position related to start of input
 * - pass caret position to model —  model.updateCaret()
 * - subscribe on model's ‘caret change’ event (index) => {}), by filtering events only related with current input and set caret position
 *
 * @todo add support for native inputs
 * @todo debug problem when document "selectionchange" is not fired on Enter press
 * @todo debug problem when offset at the end of line and at the beginning of the next line is the same
 */
export class CaretAdapter extends EventTarget {
  /**
   * Index stores start and end offset of a caret depending on a root of input
   */
  #index: TextRange = [0, 0];

  /**
   * Input element
   */
  #input: null | InputWithCaret = null;

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

  /**
   * @param model - EditorJSModel instance
   * @param blockIndex - index of a block that contains input
   */
  constructor(model: EditorJSModel, blockIndex: number) {
    super();

    this.#model = model;
    this.#blockIndex = blockIndex;

    const { on, off } = useSelectionChange();

    this.#onSelectionChange = on;
    this.#offSelectionChange = off;
  }

  /**
   * - Subscribes on input caret change
   * - Composes caret index by selection position related to start of input
   *
   * @param input - input to watch caret change
   * @param _dataKey - key of data property in block's data that contains input's value
   */
  public attachInput(input: HTMLElement, _dataKey: string): void {
    this.#input = input;

    this.#onSelectionChange(this.#input, this.#onInputSelectionChange, this);
  }

  /**
   * Unsubscribes from input caret change
   */
  public detachInput(): void {
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
   * Updates caret index
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
    ];

    /**
     * @todo
     */
    // this.#model.updateCaret(this.blockIndex, this.#index);

    this.dispatchEvent(new CustomEvent('change', {
      detail: {
        index: this.#index,
      },
    }));
  }
}
