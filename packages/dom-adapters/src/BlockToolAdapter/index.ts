import type { DataKey, EditorJSModel, ModelEvents } from '@editorjs/model';
import { EventType, EventAction } from '@editorjs/model';
import { InputType } from './types/InputType.js';
import {
  TextAddedEvent,
  TextRemovedEvent
} from '@editorjs/model/dist/utils/EventBus/events/index.js';
import { CaretAdapter } from '../caret/CaretAdapter.js';
import { getAbsoluteRangeOffset, getRelativeRangeIndex } from '../utils/index.js';

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

  /**
   *
   * @param model
   * @param blockIndex
   */
  constructor(model: EditorJSModel, blockIndex: number) {
    this.#model = model;
    this.#blockIndex = blockIndex;
  }

  /**
   * Attaches input to the model using key
   * It handles beforeinput events and updates model data
   *
   * @param key
   * @param input
   */
  public attachInput(key: DataKey, input: HTMLElement): void {
    const caretAdapter = new CaretAdapter(input, this.#model, this.#blockIndex, key);

    const inputTag = input.tagName as NativeInput;

    if (![NativeInput.Textarea, NativeInput.Input].includes(inputTag) && !input.isContentEditable) {
      throw new Error('BlockToolAdapter: input should be either INPUT, TEXTAREA or contenteditable element');
    }

    input.addEventListener('beforeinput', event => this.#handleBeforeInputEvent(event, input, key));

    this.#model.addEventListener(EventType.Changed, (event: ModelEvents) => this.#handleModelUpdate(event, input, key, caretAdapter));
  }

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
      case InputType.InsertReplacementText: {
        this.#model.removeText(this.#blockIndex, key, start, end);

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

  #handleModelUpdate(event: ModelEvents, input: HTMLElement, key: DataKey, caretAdapter: CaretAdapter): void {
    if (!(event instanceof TextAddedEvent) && !(event instanceof TextRemovedEvent)) {
      return;
    }

    const [rangeIndex, dataIndex, blockIndex] = event.detail.index;

    if (blockIndex !== this.#blockIndex) {
      return;
    }

    if (dataIndex !== `data@${key}`) {
      return;
    }

    if (!Array.isArray(rangeIndex)) {
      return;
    }

    const action = event.detail.action;

    const start = rangeIndex[0];
    const end = rangeIndex[1];

    const [startNode, startOffset] = getRelativeRangeIndex(input, start);
    const [endNode, endOffset] = getRelativeRangeIndex(input, end);
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
}
