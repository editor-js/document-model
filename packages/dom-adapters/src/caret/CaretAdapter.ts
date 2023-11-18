import type { EditorJSModel } from '@editorjs/model';
import { useSelectionChange, type Subscriber  } from './utils/useSelectionChange.js';
import { getAbsoluteRangeOffset } from './utils/absoluteOffset.js';

/**
 * Caret index is a tuple of start and end offset of a caret
 */
export type CaretIndex = [number, number];

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
  #index: CaretIndex = [0, 0];

  /**
   * Input element
   */
  #input: null | HTMLElement = null;

  /**
   * Method for subscribing on document selection change
   */
  #onSelectionChange: (callback: Subscriber) => void;

  /**
   * Method for unsubscribing from document selection change
   */
  #offSelectionChange: (callback: Subscriber) => void;

  /**
   * Callback that will be called on document selection change
   * Stored as a class property to be able to unsubscribe from document selection change
   *
   * @param selection - changed document selection
   */
  #onDocumentSelectionChange = (selection: Selection | null): void => {
    if (!this.#isSelectionRelatedToInput(selection)) {
      return;
    }

    this.#updateIndex(selection);
  };

  /**
   * @param model - EditorJSModel instance
   * @param blockIndex - index of a block that contains input
   */
  constructor(private readonly model: EditorJSModel, private readonly blockIndex: number) {
    super();

    const { on, off } = useSelectionChange();

    this.#onSelectionChange = on;
    this.#offSelectionChange = off;
  }

  /**
   * - Subscribes on input caret change
   * - Composes caret index by selection position related to start of input
   *
   * @param input - input to watch caret change
   * @param dataKey - key of data property in block's data that contains input's value
   */
  public attachInput(input: HTMLElement, dataKey: string): void {
    this.#input = input;

    this.#onSelectionChange(this.#onDocumentSelectionChange);
  }

  /**
   * Unsubscribes from input caret change
   */
  public detachInput(): void {
    this.#offSelectionChange(this.#onDocumentSelectionChange);
  }

  /**
   * Checks if selection is related to input
   *
   * @param selection - changed document selection
   */
  #isSelectionRelatedToInput(selection: Selection | null): boolean {
    if (!selection) {
      return false;
    }

    const range = selection.getRangeAt(0);

    return this.#input?.contains(range.startContainer) ?? false;
  }

  /**
   * Returns absolute caret index related to input
   */
  public get index(): CaretIndex {
    return this.#index;
  }

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
