import { useSelectionChange } from '../caret/utils/useSelectionChange.js';
import type { Caret, EditorJSModel, DataIndex, TextIndex, CaretManagerEvents, Index } from '@editorjs/model';
import {getAbsoluteRangeOffset, getBoundaryPointByAbsoluteOffset, isNativeInput} from '../utils/index.js';
import type { TextRange } from '@editorjs/model';
import { EventType } from '@editorjs/model';

function hashIndex(index: Readonly<Index>): string {
  return JSON.stringify(index);
}

function parseIndex<T extends Index>(hash: string): T {
  return JSON.parse(hash) as T;
}

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
  public attachInput(input: HTMLElement, index: DataIndex<'data'>): void {
    this.#inputs.set(hashIndex(index), input);
  }

  /**
   *
   * @param index
   */
  public updateIndex(index: TextIndex): void {
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

        this.updateIndex([textRange, ...parseIndex<DataIndex<'data'>>(index)]);

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

      this.updateIndex([textRange, ...parseIndex<DataIndex<'data'>>(index)]);

      /**
       * For now we handle only first found input
       */
      break;
    }
  }

  #onModelUpdate(event: CaretManagerEvents): void {
    const [textIndex, dataIndex, blockIndex] = event.detail.index as TextIndex;
    const caretId = event.detail.id;

    if (caretId !== this.#userCaret.id) {
      return;
    }

    const input = this.#inputs.get(hashIndex([dataIndex, blockIndex]));

    if (!input) {
      return;
    }

    if (isNativeInput(input)) {
      input.selectionStart = textIndex[0];
      input.selectionEnd = textIndex[1];

      return;
    }

    const start = getBoundaryPointByAbsoluteOffset(input, textIndex[0]);
    const end = getBoundaryPointByAbsoluteOffset(input, textIndex[1]);

    const selection = document.getSelection()!;
    const range = new Range();

    range.setStart(...start);
    range.setEnd(...end);

    selection.removeAllRanges();

    selection.addRange(range);
  }
}
