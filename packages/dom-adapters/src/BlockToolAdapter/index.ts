import type { DataKey, EditorJSModel, ModelEvents } from '@editorjs/model';
import { EventType, EventAction, composeDataIndex } from '@editorjs/model';
import { InputType } from './types/InputType.js';
import {
  TextAddedEvent,
  TextRemovedEvent
} from '@editorjs/model';
import type { CaretAdapter } from '../CaretAdapter/index.js';
import { getAbsoluteRangeOffset, getBoundaryPointByAbsoluteOffset } from '../utils/index.js';

enum NativeInput {
  Textarea = 'TEXTAREA',
  Input = 'INPUT',
}

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

  #caretAdapter: CaretAdapter;

  /**
   * BlockToolAdapter constructor
   *
   * @param model - EditorJSModel instance
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
    const inputTag = input.tagName as NativeInput;

    /**
     * @todo Filter non-text-editable inputs
     */
    if (![NativeInput.Textarea, NativeInput.Input].includes(inputTag) && !input.isContentEditable) {
      throw new Error('BlockToolAdapter: input should be either INPUT, TEXTAREA or contenteditable element');
    }

    input.addEventListener('beforeinput', event => this.#handleBeforeInputEvent(event, input, key));

    this.#model.addEventListener(EventType.Changed, (event: ModelEvents) => this.#handleModelUpdate(event, input, key));
    this.#caretAdapter.attachInput(input, [composeDataIndex(key), this.#blockIndex]);
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
  #handleBeforeInputEvent(event: InputEvent, input: HTMLElement, key: DataKey): void {
    /**
     * We prevent all events to handle them manually via model update
     */
    event.preventDefault();

    const inputType = event.inputType as InputType;
    const targetRanges = event.getTargetRanges();
    const range = targetRanges[0];

    const start = getAbsoluteRangeOffset(input, range.startContainer, range.startOffset);
    const end = getAbsoluteRangeOffset(input, range.endContainer, range.endOffset);

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
         * If start and end aren't equal, it means that user selected some text and replaced it with new one
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
        this.#model.removeText(this.#blockIndex, key, start, end);

        break;
      }

      default:
    }
  }

  /**
   * Handles model update events and updates DOM
   *
   * @param event - model update event
   * @param input - attched input element
   * @param key - data key input is attached to
   */
  #handleModelUpdate(event: ModelEvents, input: HTMLElement, key: DataKey): void {
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

    const action = event.detail.action;

    const start = rangeIndex[0];
    const end = rangeIndex[1];

    const [startNode, startOffset] = getBoundaryPointByAbsoluteOffset(input, start);
    const [endNode, endOffset] = getBoundaryPointByAbsoluteOffset(input, end);
    const range = new Range();

    range.setStart(startNode, startOffset);

    switch (action) {
      case EventAction.Added: {
        const text = event.detail.data as string;
        const textNode = document.createTextNode(text);

        range.insertNode(textNode);

        this.#caretAdapter.updateIndex([[start + text.length, start + text.length], composeDataIndex(key), this.#blockIndex]);

        break;
      }
      case EventAction.Removed: {
        range.setEnd(endNode, endOffset);

        range.deleteContents();

        this.#caretAdapter.updateIndex([[start, start], composeDataIndex(key), this.#blockIndex]);

        break;
      }
    }

    input.normalize();
  }
}
