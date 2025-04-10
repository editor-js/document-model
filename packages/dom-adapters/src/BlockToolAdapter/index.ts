import { isNativeInput } from '@editorjs/dom';
import {
  type EditorJSModel,
  type DataKey,
  createDataKey,
  EventAction,
  EventType,
  IndexBuilder,
  type ModelEvents,
  TextAddedEvent,
  TextRemovedEvent
} from '@editorjs/model';
import type { CaretAdapter } from '../CaretAdapter/index.js';
import {
  findNextHardLineBoundary,
  findNextWordBoundary, findPreviousHardLineBoundary,
  findPreviousWordBoundary,
  getAbsoluteRangeOffset,
  getBoundaryPointByAbsoluteOffset,
  isNonTextInput
} from '../utils/index.js';
import { InputType } from './types/InputType.js';
import type { BlockToolAdapter as BlockToolAdapterInterface, CoreConfig } from '@editorjs/sdk';
import type { FormattingAdapter } from '../FormattingAdapter/index.js';
import type { EventBus } from '@editorjs/sdk';

/**
 * BlockToolAdapter is using inside Block tools to connect browser DOM elements to the model
 * It can handle beforeinput events and update model data
 * It can handle model's change events and update DOM
 */
export class BlockToolAdapter implements BlockToolAdapterInterface {
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
   */
  #caretAdapter: CaretAdapter;

  /**
   * Formatting adapter instance
   */
  #formattingAdapter: FormattingAdapter;

  /**
   * Name of the tool that this adapter is connected to
   */
  #toolName: string;

  /**
   * Editor's config
   */
  #config: CoreConfig;

  /**
   * BlockToolAdapter constructor
   *
   * @param config - Editor's config
   * @param model - EditorJSModel instance
   * @param eventBus - Editor EventBus instance
   * @param caretAdapter - CaretAdapter instance
   * @param blockIndex - index of the block that this adapter is connected to
   * @param formattingAdapter - needed to render formatted text
   * @param toolName - tool name of the block
   */
  constructor(config: CoreConfig, model: EditorJSModel, eventBus: EventBus, caretAdapter: CaretAdapter, blockIndex: number, formattingAdapter: FormattingAdapter, toolName: string) {
    this.#config = config;
    this.#model = model;
    this.#blockIndex = blockIndex;
    this.#caretAdapter = caretAdapter;
    this.#formattingAdapter = formattingAdapter;
    this.#toolName = toolName;
  }

  /**
   * Attaches input to the model using key
   * It handles beforeinput events and updates model data
   *
   * @param keyRaw - tools data key to attach input to
   * @param input - input element
   */
  public attachInput(keyRaw: string, input: HTMLElement): void {
    if (input instanceof HTMLInputElement && isNonTextInput(input)) {
      throw new Error('Cannot attach non-text input');
    }

    const key = createDataKey(keyRaw);

    input.addEventListener('beforeinput', event => this.#handleBeforeInputEvent(event, input, key));

    this.#model.addEventListener(EventType.Changed, (event: ModelEvents) => this.#handleModelUpdate(event, input, key));

    const builder = new IndexBuilder();

    builder.addBlockIndex(this.#blockIndex).addDataKey(key);

    this.#caretAdapter.attachInput(input, builder.build());

    try {
      const value = this.#model.getText(this.#blockIndex, key);
      const fragments = this.#model.getFragments(this.#blockIndex, key);

      input.textContent = value;

      fragments.forEach(fragment => {
        this.#formattingAdapter.formatElementContent(input, fragment);
      });
    } catch (_) {
      // do nothing — TextNode is not created yet as there is no initial data in the model
    }
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
     * If selection is not collapsed, just remove selected text
     */
    if (start !== end) {
      this.#model.removeText(this.#config.userId, this.#blockIndex, key, start, end);

      return;
    }

    switch (inputType) {
      case InputType.DeleteContentForward: {
        /**
         * If selection end is already after the last element, then there is nothing to delete
         */
        end = end !== input.value.length ? end + 1 : end;
        break;
      }
      case InputType.DeleteContentBackward: {
        /**
         * If start is already 0, then there is nothing to delete
         */
        start = start !== 0 ? start - 1 : start;

        break;
      }

      case InputType.DeleteWordBackward: {
        start = findPreviousWordBoundary(input.value, start);

        break;
      }

      case InputType.DeleteWordForward: {
        end = findNextWordBoundary(input.value, start);

        break;
      }

      case InputType.DeleteHardLineBackward: {
        start = findPreviousHardLineBoundary(input.value, start);

        break;
      }
      case InputType.DeleteHardLineForward: {
        end = findNextHardLineBoundary(input.value, start);

        break;
      }

      case InputType.DeleteSoftLineBackward:
      case InputType.DeleteSoftLineForward:
      case InputType.DeleteEntireSoftLine:
      /**
       * @todo Think of how to find soft line boundaries
       */

      case InputType.DeleteByDrag:
      case InputType.DeleteByCut:
      case InputType.DeleteContent:

      default:
      /**
       * do nothing, use start and end from user selection
       */
    }

    this.#model.removeText(this.#config.userId, this.#blockIndex, key, start, end);
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

    this.#model.removeText(this.#config.userId, this.#blockIndex, key, start, end);
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
      case InputType.InsertFromDrop:
      case InputType.InsertFromPaste: {
        if (start !== end) {
          this.#model.removeText(this.#config.userId, this.#blockIndex, key, start, end);
        }

        let data: string;

        /**
         * For native inputs data for those events comes from event.data property
         * while for contenteditable elements it's stored in event.dataTransfer
         *
         * @see https://www.w3.org/TR/input-events-2/#overview
         */
        if (isInputNative) {
          data = event.data ?? '';
        } else {
          data = event.dataTransfer!.getData('text/plain');
        }

        this.#model.insertText(this.#config.userId, this.#blockIndex, key, data, start);

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
          this.#model.removeText(this.#config.userId, this.#blockIndex, key, start, end);
        }

        const data = event.data as string;

        this.#model.insertText(this.#config.userId, this.#blockIndex, key, data, start);
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
      case InputType.DeleteEntireSoftLine:
      case InputType.DeleteWordBackward:
      case InputType.DeleteWordForward: {
        if (isInputNative === true) {
          this.#handleDeleteInNativeInput(event, input as HTMLInputElement | HTMLTextAreaElement, key);
        } else {
          this.#handleDeleteInContentEditable(event, input, key);
        }
        break;
      }

      case InputType.InsertParagraph:
        this.#handleSplit(key, start, end);
        break;
      case InputType.InsertLineBreak:
        /**
         * @todo Think if we need to keep that or not
         */
        if (isInputNative === true) {
          this.#model.insertText(this.#config.userId, this.#blockIndex, key, '\n', start);
        }
        break;
      default:
    }
  };

  /**
   * Splits the current block's data field at the specified index
   * Removes selected range if it's not collapsed
   * Sets caret to the beginning of the next block
   *
   * @param key - data key to split
   * @param start - start index of the split
   * @param end - end index of the selected range
   */
  #handleSplit(key: DataKey, start: number, end: number): void {
    const currentValue = this.#model.getText(this.#blockIndex, key);
    const newValueAfter = currentValue.slice(end);

    const relatedFragments = this.#model.getFragments(this.#blockIndex, key, end, currentValue.length);

    /**
     * Fragment ranges bounds should be decreased by end index, because end is the index of the first character of the new block
     */
    relatedFragments.forEach(fragment => {
      fragment.range[0] = Math.max(0, fragment.range[0] - start);
      fragment.range[1] -= end;
    });

    this.#model.removeText(this.#config.userId, this.#blockIndex, key, start, currentValue.length);
    this.#model.addBlock(
      this.#config.userId,
      {
        name: this.#toolName,
        data : {
          [key]: {
            $t: 't',
            value: newValueAfter,
            fragments: relatedFragments,
          },
        },
      },
      this.#blockIndex + 1
    );

    /**
     * Raf is needed to ensure that the new block is added so caret can be moved to it
     */
    requestAnimationFrame(() => {
      this.#caretAdapter.updateIndex(
        new IndexBuilder()
          .addBlockIndex(this.#blockIndex + 1)
          .addDataKey(key)
          .addTextRange([0, 0])
          .build()
      );
    });
  }

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

    const { textRange, dataKey, blockIndex } = event.detail.index;

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

    const caretIndexBuilder = new IndexBuilder();

    caretIndexBuilder.from(event.detail.index);

    switch (action) {
      case EventAction.Added: {
        const text = event.detail.data as string;
        const prevValue = currentElement.value;

        currentElement.value = prevValue.slice(0, start) + text + prevValue.slice(start);

        caretIndexBuilder.addTextRange([start + text.length, start + text.length]);

        break;
      }
      case EventAction.Removed: {
        currentElement.value = currentElement.value.slice(0, start) +
          currentElement.value.slice(end);

        caretIndexBuilder.addTextRange([start, start]);

        break;
      }
    }

    this.#caretAdapter.updateIndex(caretIndexBuilder.build());
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

        break;
      }
      case EventAction.Removed: {
        range.setEnd(endNode, endOffset);

        range.deleteContents();

        builder.addTextRange([start, start]);

        break;
      }
    }

    input.normalize();

    this.#caretAdapter.updateIndex(builder.build());
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
