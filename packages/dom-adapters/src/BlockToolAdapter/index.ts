import type { DataKey, EditorJSModel, ModelEvents } from '@editorjs/model';
import {
  composeDataIndex,
  EventAction,
  EventType,
  TextAddedEvent,
  TextRemovedEvent
} from '@editorjs/model';
import { InputType } from './types/InputType.js';
import { CaretAdapter } from '../caret/CaretAdapter.js';
import { isNativeInput } from '../utils/index.js';
import {
  getAbsoluteRangeOffset,
  getBoundaryPointByAbsoluteOffset,
  InputMode,
} from '../utils/index.js';

/**
 * BlockToolAdapter is using inside Block tools to connect browser DOM elements to the model
 * It can handle beforeinput events and update model data
 * It can handle model's change events and update DOM
 */
export class BlockToolAdapter {
  /**
   * Model instance
   */
  #model: EditorJSModel;

  /**
   * Index of the block that this adapter is connected to
   */
  #blockIndex: number;

  /**
   * Input mode
   */
  #mode: InputMode = InputMode.Native;

  /**
   * BlockToolAdapter constructor
   *
   * @param model - EditorJSModel instance
   * @param blockIndex - index of the block that this adapter is connected to
   */
  constructor(model: EditorJSModel, blockIndex: number) {
    this.#model = model;
    this.#blockIndex = blockIndex;
  }

  /**
   * Attaches input to the model using key
   * It handles beforeinput events and updates model data
   *
   * @param key - data key to attach input to
   * @param input - input element
   */
  public attachInput(key: DataKey, input: HTMLElement): void {
    if (isNativeInput(input)) {
      this.#mode = InputMode.Native;
    } else if (input.isContentEditable) {
      this.#mode = InputMode.ContentEditable;
    } else {
      throw new Error('BlockToolAdapter: input should be either INPUT, TEXTAREA or contenteditable element');
    }

    const caretAdapter = new CaretAdapter(input, this.#model, this.#blockIndex, key);

    input.addEventListener('beforeinput', event => this.#handleBeforeInputEvent(event, input, key));

    this.#model.addEventListener(EventType.Changed, (event: ModelEvents) => this.#handleModelUpdate(event, input, key, caretAdapter));
  }

  /**
   * Handles beforeinput event from user input and updates model data
   *
   * We prevent beforeinput event of any type to handle it manually via model update
   *
   * @param event - beforeinput event
   * @param input - input element
   * @param key - data key input is attached to
   */
  #handleBeforeInputEvent = (event: InputEvent, input: HTMLElement, key: DataKey): void => {
    /**
     * We prevent all events to handle them manually via model update
     */
    event.preventDefault();

    const nativeInput = this.#mode === InputMode.Native;
    const inputType = event.inputType as InputType;
    let start: number;
    let end: number;

    if (!nativeInput) {
      const targetRanges = event.getTargetRanges();
      const range = targetRanges[0];

      start = getAbsoluteRangeOffset(input, range.startContainer,
        range.startOffset);
      end = getAbsoluteRangeOffset(input, range.endContainer,
        range.endOffset);
    } else {
      const currentElement = input as HTMLInputElement | HTMLTextAreaElement;

      start = currentElement.selectionStart as number;
      end = currentElement.selectionEnd as number;
    }

    switch (inputType) {
      case InputType.InsertReplacementText:
      case InputType.InsertFromPaste: {
        this.#model.removeText(this.#blockIndex, key, start, end);

        /**
         * DataTransfer object is guaranteed to be not null for these types of event for contenteditable elements
         *
         * However, it is not guaranteed for INPUT and TEXTAREA elements, so @todo handle this case
         *
         * @see https://www.w3.org/TR/input-events-2/#overview
         */
        const data = event.dataTransfer!.getData('text/plain');

        this.#model.insertText(this.#blockIndex, key, data, start);

        break;
      }
      case InputType.InsertText:
      /**
       * @todo Handle composition events
       */
      case InputType.InsertCompositionText: {
        /**
         * If start and end aren't equal,
         * it means that user selected some text and replaced it with new one
         */
        if (start !== end) {
          this.#model.removeText(this.#blockIndex, key, start, end);
        }

        const data = event.data as string;

        this.#model.insertText(this.#blockIndex, key, data, start);
        break;
      }

      case InputType.DeleteContent:
      case InputType.DeleteContentBackward:
      case InputType.DeleteContentForward:
      case InputType.DeleteByCut:
      case InputType.DeleteByDrag:
      case InputType.DeleteHardLineBackward:
      case InputType.DeleteHardLineForward:
      case InputType.DeleteSoftLineBackward:
      case InputType.DeleteSoftLineForward:
      case InputType.DeleteWordBackward:
      case InputType.DeleteWordForward: {
        if (nativeInput && start > 0 && start === end) {
          // for native input elements, we need to handle backspace manually
          start = start - 1;
        }
        this.#model.removeText(this.#blockIndex, key, start, end);

        break;
      }

      default:
    }
  };

  /**
   * Handles model update events and updates DOM
   *
   * @param event - model update event
   * @param input - attched input element
   * @param key - data key input is attached to
   * @param caretAdapter - caret adapter instance
   */
  #handleModelUpdate = (event: ModelEvents, input: HTMLElement, key: DataKey, caretAdapter: CaretAdapter): void => {
    const nativeInput = this.#mode === InputMode.Native;

    if (!(event instanceof TextAddedEvent) && !(event instanceof TextRemovedEvent)) {
      return;
    }

    const [rangeIndex, dataIndex, blockIndex] = event.detail.index;

    /**
     * Event is not related to the attached block
     */
    if (blockIndex !== this.#blockIndex) {
      return;
    }

    /**
     * Event is not related to the attached data key
     */
    if (dataIndex !== composeDataIndex(key)) {
      return;
    }

    if (nativeInput) {
      const currentElement = input as HTMLInputElement | HTMLTextAreaElement;
      const start = currentElement.selectionStart!;
      const end = currentElement.selectionEnd!;

      // todo:
      //  caretAdapter cannot handle native input
      //  because it doesn't have the content of the input
      const action = event.detail.action;

      switch (action) {
        case EventAction.Added: {
          const text = event.detail.data as string;

          currentElement.value = currentElement.value.slice(0, start) + text + currentElement.value.slice(end);

          currentElement.setSelectionRange(start + text.length, start + text.length);
          break;
        }
        case EventAction.Removed: {
          if (
            start === end &&
            // stop removing if the caret is at the beginning of the input
            start > 0
          ) {
            currentElement.value = currentElement.value.slice(0, start - 1) +
              currentElement.value.slice(end);
            if (start === 0) {
              currentElement.setSelectionRange(start, start);
            } else {
              currentElement.setSelectionRange(start - 1, start - 1);
            }
            break;
          } else {
            currentElement.value = currentElement.value.slice(0, start) +
              currentElement.value.slice(end);
            currentElement.setSelectionRange(start, start);
            break;
          }
        }
      }
    } else {
      const action = event.detail.action;

      const start = rangeIndex[0];
      const end = rangeIndex[1];

      const [startNode, startOffset] = getBoundaryPointByAbsoluteOffset(input,
        start);
      const [endNode, endOffset] = getBoundaryPointByAbsoluteOffset(input, end);
      const range = new Range();

      range.setStart(startNode, startOffset);

      switch (action) {
        case EventAction.Added: {
          const text = event.detail.data as string;
          const textNode = document.createTextNode(text);

          range.insertNode(textNode);

          caretAdapter.updateIndex([start + text.length, start + text.length]);

          break;
        }
        case EventAction.Removed: {
          range.setEnd(endNode, endOffset);

          range.deleteContents();

          caretAdapter.updateIndex([start, start]);

          break;
        }
      }

      input.normalize();
    }
  };
}
