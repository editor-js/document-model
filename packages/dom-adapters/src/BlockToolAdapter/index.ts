import { type DataKey, type EditorJSModel, IndexBuilder, type ModelEvents } from '@editorjs/model';
import {
  EventAction,
  EventType,
  TextAddedEvent,
  TextRemovedEvent
} from '@editorjs/model';
import { InputType } from './types/InputType.js';
import {
  getAbsoluteRangeOffset,
  getBoundaryPointByAbsoluteOffset,
  isNonTextInput
} from '../utils/index.js';
import type { CaretAdapter } from '../CaretAdapter/index.js';

import { isNativeInput } from '@editorjs/dom';

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
   * Caret adapter instance
   *
   * @private
   */
  #caretAdapter: CaretAdapter;

  /**
   * BlockToolAdapter constructor
   *
   * @param model - EditorJSModel instance
   * @param caretAdapter - CaretAdapter instance
   * @param blockIndex - index of the block that this adapter is connected to
   */
  constructor(model: EditorJSModel, caretAdapter: CaretAdapter, blockIndex: number) {
    this.#model = model;
    this.#blockIndex = blockIndex;
    this.#caretAdapter = caretAdapter;
  }

  /**
   * Attaches input to the model using key
   * It handles beforeinput events and updates model data
   *
   * @param key - data key to attach input to
   * @param input - input element
   */
  public attachInput(key: DataKey, input: HTMLElement): void {
    if (input instanceof HTMLInputElement && isNonTextInput(input)) {
      throw new Error('Cannot attach non-text input');
    }

    input.addEventListener('beforeinput', event => this.#handleBeforeInputEvent(event, input, key));

    this.#model.addEventListener(EventType.Changed, (event: ModelEvents) => this.#handleModelUpdate(event, input, key));

    const builder = new IndexBuilder();

    builder.addBlockIndex(this.#blockIndex).addDataKey(key);

    this.#caretAdapter.attachInput(input, builder.build());
  }

  /**
   * Handles delete events in native input
   *
   * @param event - beforeinput event
   * @param input - input element
   * @param key - data key input is attached to
   * @private
   */
  #handleDeleteInNativeInput(event: InputEvent, input: HTMLInputElement | HTMLTextAreaElement, key: DataKey): void {
    const inputType = event.inputType as InputType;

    /**
     * Check that selection exists in current input
     */
    if (input.selectionStart === null || input.selectionEnd === null) {
      return;
    }

    let start = input.selectionStart;
    let end = input.selectionEnd;

    /**
     * @todo Handle all possible deletion events
     */
    switch (inputType) {
      case InputType.DeleteContentForward: {
        /**
         * If selection end is already after the last element, then there is nothing to delete
         */
        end = end !== input.value.length ? end + 1 : end;
        break;
      }
      default: {
        /**
         * If start is already 0, then there is nothing to delete
         */
        start = start !== 0 ? start - 1 : start;
      }
    }
    this.#model.removeText(this.#blockIndex, key, start, end);
  };

  /**
   * Handles delete events in contenteditable element
   *
   * @param event - beforeinput event
   * @param input - input element
   * @param key - data key input is attached to
   */
  #handleDeleteInContentEditable(event: InputEvent, input: HTMLElement, key: DataKey): void {
    const targetRanges = event.getTargetRanges();
    const range = targetRanges[0];

    const start: number = getAbsoluteRangeOffset(input, range.startContainer, range.startOffset);
    const end: number = getAbsoluteRangeOffset(input, range.endContainer, range.endOffset);

    this.#model.removeText(this.#blockIndex, key, start, end);
  };

  /**
   * Handles beforeinput event from user input and updates model data
   *
   * We prevent beforeinput event of any type to handle it manually via model update
   *
   * @param event - beforeinput event
   * @param input - input element
   * @param key - data key input is attached to
   */
  #handleBeforeInputEvent(event: InputEvent, input: HTMLElement, key: DataKey): void {
    /**
     * We prevent all events to handle them manually via model update
     */
    event.preventDefault();

    const isInputNative = isNativeInput(input);
    const inputType = event.inputType as InputType;
    let start: number;
    let end: number;

    if (isInputNative === false) {
      const targetRanges = event.getTargetRanges();
      const range = targetRanges[0];

      start = getAbsoluteRangeOffset(input, range.startContainer, range.startOffset);
      end = getAbsoluteRangeOffset(input, range.endContainer, range.endOffset);
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
        if (isInputNative === true) {
          this.#handleDeleteInNativeInput(event, input as HTMLInputElement | HTMLTextAreaElement, key);
        } else {
          this.#handleDeleteInContentEditable(event, input, key);
        }
        break;
      }

      default:
    }
  };

  /**
   * Handles model update events for native inputs and updates DOM
   *
   * @param event - model update event
   * @param input - input element
   * @param key - data key input is attached to
   */
  #handleModelUpdateForNativeInput(event: ModelEvents, input: HTMLInputElement | HTMLTextAreaElement, key: DataKey): void {
    if (!(event instanceof TextAddedEvent) && !(event instanceof TextRemovedEvent)) {
      return;
    }

    const { textRange, dataKey, blockIndex }  = event.detail.index;

    if (textRange === undefined) {
      return;
    }

    /**
     * Event is not related to the attached block
     */
    if (blockIndex !== this.#blockIndex) {
      return;
    }

    /**
     * Event is not related to the attached data key
     */
    if (dataKey !== key) {
      return;
    }

    const currentElement = input;
    const [start, end] = textRange;

    const action = event.detail.action;

    switch (action) {
      case EventAction.Added: {
        const text = event.detail.data as string;
        const prevValue = currentElement.value;

        currentElement.value = prevValue.slice(0, start) + text + prevValue.slice(end - 1);

        currentElement.setSelectionRange(start + text.length, start + text.length);
        break;
      }
      case EventAction.Removed: {
        currentElement.value = currentElement.value.slice(0, start) +
          currentElement.value.slice(end);
        currentElement.setSelectionRange(start, start);
        break;
      }
    }
  };

  /**
   * Handles model update events for contenteditable elements and updates DOM
   *
   * @param event - model update event
   * @param input - input element
   * @param key - data key input is attached to
   */
  #handleModelUpdateForContentEditableElement(event: ModelEvents, input: HTMLElement, key: DataKey): void {
    if (!(event instanceof TextAddedEvent) && !(event instanceof TextRemovedEvent)) {
      return;
    }

    const { textRange, dataKey, blockIndex } = event.detail.index;

    if (blockIndex !== this.#blockIndex) {
      return;
    }

    /**
     * Event is not related to the attached data key
     */
    if (dataKey !== key) {
      return;
    }

    if (textRange === undefined) {
      return;
    }

    const action = event.detail.action;

    const start = textRange[0];
    const end = textRange[1];

    const [startNode, startOffset] = getBoundaryPointByAbsoluteOffset(input, start);
    const [endNode, endOffset] = getBoundaryPointByAbsoluteOffset(input, end);
    const range = new Range();

    range.setStart(startNode, startOffset);

    const builder = new IndexBuilder();

    builder.addDataKey(key).addBlockIndex(this.#blockIndex);

    switch (action) {
      case EventAction.Added: {
        const text = event.detail.data as string;
        const textNode = document.createTextNode(text);

        range.insertNode(textNode);

        builder.addTextRange([start + text.length, start + text.length]);

        this.#caretAdapter.updateIndex(builder.build());

        break;
      }
      case EventAction.Removed: {
        range.setEnd(endNode, endOffset);

        range.deleteContents();

        builder.addTextRange([start, start]);

        this.#caretAdapter.updateIndex(builder.build());

        break;
      }
    }

    input.normalize();
  };

  /**
   * Handles model update events and updates DOM
   *
   * @param event - model update event
   * @param input - attched input element
   * @param key - data key input is attached to
   */
  #handleModelUpdate(event: ModelEvents, input: HTMLElement, key: DataKey): void {
    const isInputNative = isNativeInput(input);

    if (isInputNative === true) {
      this.#handleModelUpdateForNativeInput(event, input as HTMLInputElement | HTMLTextAreaElement, key);
    } else {
      this.#handleModelUpdateForContentEditableElement(event, input, key);
    }
  };
}
