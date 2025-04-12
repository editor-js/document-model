import { isNativeInput } from '@editorjs/dom';
import {
  BlockAddedEvent,
  BlockRemovedEvent,
  createDataKey,
  type DataKey, DataNodeAddedEvent, DataNodeRemovedEvent,
  type EditorJSModel,
  EventAction,
  EventType,
  IndexBuilder,
  type ModelEvents,
  TextAddedEvent,
  TextRemovedEvent
} from '@editorjs/model';
import type {
  EventBus,
  BlockToolAdapter as BlockToolAdapterInterface,
  CoreConfig,
  BeforeInputUIEvent,
  BeforeInputUIEventPayload,
} from '@editorjs/sdk';
import { BeforeInputUIEventName } from '@editorjs/sdk';
import type { CaretAdapter } from '../CaretAdapter/index.js';
import type { FormattingAdapter } from '../FormattingAdapter/index.js';
import {
  findNextHardLineBoundary,
  findNextWordBoundary,
  findPreviousHardLineBoundary,
  findPreviousWordBoundary,
  getAbsoluteRangeOffset,
  getBoundaryPointByAbsoluteOffset,
  isNonTextInput
} from '../utils/index.js';
import { InputType } from './types/InputType.js';

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
  #config: Required<CoreConfig>;

  /**
   * Inputs that bound to the model
   */
  #attachedInputs = new Map<DataKey, HTMLElement>();

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
  constructor(
    config: Required<CoreConfig>,
    model: EditorJSModel,
    eventBus: EventBus,
    caretAdapter: CaretAdapter,
    blockIndex: number,
    formattingAdapter: FormattingAdapter,
    toolName: string
  ) {
    this.#config = config;
    this.#model = model;
    this.#blockIndex = blockIndex;
    this.#caretAdapter = caretAdapter;
    this.#formattingAdapter = formattingAdapter;
    this.#toolName = toolName;

    this.#model.addEventListener(EventType.Changed, (event: ModelEvents) => this.#handleModelUpdate(event));

    eventBus.addEventListener(`ui:${BeforeInputUIEventName}`, (event: BeforeInputUIEvent) => {
      this.#processDelegatedBeforeInput(event);
    });
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

    this.#attachedInputs.set(key, input);

    this.#model.createDataNode(
      this.#config.userId,
      this.#blockIndex,
      key,
      {
        $t: 't',
        value: '',
      }
    );

    const builder = new IndexBuilder();

    builder.addBlockIndex(this.#blockIndex).addDataKey(key);

    this.#caretAdapter.attachInput(input, builder.build());

    const value = this.#model.getText(this.#blockIndex, key);
    const fragments = this.#model.getFragments(this.#blockIndex, key);

    input.textContent = value;

    fragments.forEach(fragment => {
      this.#formattingAdapter.formatElementContent(input, fragment);
    });
  }

  /**
   * Removes the input from the DOM by key
   *
   * @param keyRaw - key of the input to remove
   */
  public detachInput(keyRaw: string): void {
    const key = createDataKey(keyRaw);
    const input = this.#attachedInputs.get(key);

    if (!input) {
      return;
    }

    /**
     * @todo Let BlockTool handle DOM update
     */
    input.remove();
    this.#caretAdapter.detachInput(
      new IndexBuilder()
        .addBlockIndex(this.#blockIndex)
        .addDataKey(key)
        .build()
    );

    this.#attachedInputs.delete(key);

    this.#model.removeDataNode(this.#config.userId, this.#blockIndex, key);
  }

  /**
   * Check current selection and find all inputs that contain target ranges
   *
   * @param targetRanges - ranges to find inputs for
   * @returns array of tuples containing data key and input element
   */
  #findInputsByRanges(targetRanges: StaticRange[]): [DataKey, HTMLElement][] {
    return Array.from(this.#attachedInputs.entries()).filter(([_, input]) => {
      return targetRanges.some(range => {
        const startContainer = range.startContainer;
        const endContainer = range.endContainer;
        const isCollapsed = range.collapsed;

        /**
         * Case 1: Input is a native input — check if it has selection or is between selected inputs
         */
        if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
          /**
           * If this input has selection, include it
           */
          if (input.selectionStart !== null && input.selectionEnd !== null) {
            return true;
          }

          /**
           * Check if this input is between the range boundaries
           */
          const startPosition = startContainer.compareDocumentPosition(input);
          const endPosition = input.compareDocumentPosition(endContainer);

          return (startPosition & Node.DOCUMENT_POSITION_FOLLOWING) &&
                 (endPosition & Node.DOCUMENT_POSITION_FOLLOWING);
        }

        /**
         * Case 2: Input is a contenteditable element — check if it's between start and end
         */
        if (input.isContentEditable) {
          /**
           * Casw 2.1 — input contains either start or end of selection
           */
          if (input.contains(startContainer) || input.contains(endContainer)) {
            return true;
          }

          /**
           * Case 2.2 — collapsed selection inside the input
           */
          if (isCollapsed) {
            return input.contains(startContainer);
          }

          /**
           * Case 2.3 — input is between start and end
           */
          const startPosition = startContainer.compareDocumentPosition(input);
          const endPosition = endContainer.compareDocumentPosition(input);

          const isBetween = (
            Boolean(startPosition & Node.DOCUMENT_POSITION_FOLLOWING) &&
            Boolean(endPosition & Node.DOCUMENT_POSITION_PRECEDING)
          );

          return isBetween;
        }

        return false;
      });
    });
  }

  /**
   * Handles 'beforeinput' event delegated from the blocks host element
   *
   * @param event - event containig necessary data
   */
  #processDelegatedBeforeInput(event: BeforeInputUIEvent): void {
    const { targetRanges } = event.detail;
    const inputs = this.#findInputsByRanges(targetRanges);

    if (inputs.length === 0) {
      return;
    }

    inputs.forEach(([dataKey, input]) => {
      this.#handleBeforeInputEvent(event.detail, input, dataKey);
    });
  }

  /**
   * Handles delete events in native input
   *
   * @param payload - beforeinput event payload
   * @param input - input element
   * @param key - data key input is attached to
   * @param range - target range for this input
   * @private
   */
  #handleDeleteInNativeInput(
    payload: BeforeInputUIEventPayload,
    input: HTMLInputElement | HTMLTextAreaElement,
    key: DataKey,
    range: StaticRange
  ): void {
    const inputType = payload.inputType;
    const inputValue = input.value;
    const inputLength = inputValue.length;

    let start = 0;
    let end = inputLength;

    /**
     * If range is fully contained within this input
     */
    if (input.contains(range.startContainer) && input.contains(range.endContainer)) {
      start = range.startOffset;
      end = range.endOffset;
    } else if (input.contains(range.startContainer)) {
      /**
       * If only start is in this input, delete from start to end of input
       */
      start = range.startOffset;
    } else if (input.contains(range.endContainer)) {
      /**
       * If only end is in this input, delete from start of input to end
       */
      end = range.endOffset;
    }

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
        end = end !== inputValue.length ? end + 1 : end;
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
        start = findPreviousWordBoundary(inputValue, start);
        break;
      }
      case InputType.DeleteWordForward: {
        end = findNextWordBoundary(inputValue, start);
        break;
      }
      case InputType.DeleteHardLineBackward: {
        start = findPreviousHardLineBoundary(inputValue, start);
        break;
      }
      case InputType.DeleteHardLineForward: {
        end = findNextHardLineBoundary(inputValue, start);
        break;
      }
      case InputType.DeleteSoftLineBackward:
      case InputType.DeleteSoftLineForward:
      case InputType.DeleteEntireSoftLine:
        /**
         * @todo Think of how to find soft line boundaries
         */
        break;
      case InputType.DeleteByDrag:
      case InputType.DeleteByCut:
      case InputType.DeleteContent:
      default:
        /**
         * do nothing, use start and end from range
         */
    }

    this.#model.removeText(this.#config.userId, this.#blockIndex, key, start, end);
  }

  #isInputContainsOnlyStartOfSelection(input: HTMLElement, range: StaticRange): boolean {
    return input.contains(range.startContainer) && !input.contains(range.endContainer);
  }

  #isInputContainsOnlyEndOfSelection(input: HTMLElement, range: StaticRange): boolean {
    return input.contains(range.endContainer) && !input.contains(range.startContainer);
  }

  #isInputContainsWholeSelection(input: HTMLElement, range: StaticRange): boolean {
    return input.contains(range.startContainer) && input.contains(range.endContainer);
  }

  #isInputInBetweenSelection(input: HTMLElement, range: StaticRange): boolean {
    return !this.#isInputContainsWholeSelection(input, range) &&
           !this.#isInputContainsOnlyStartOfSelection(input, range) &&
           !this.#isInputContainsOnlyEndOfSelection(input, range);
  }

  /**
   * Handles delete events in contenteditable element
   *
   * @param input - input element
   * @param key - data key input is attached to
   * @param range - target range for this input
   * @param isRestoreCaretToTheEnd - by default caret is restored to the range start,
   *                                 but sometimes (e.g. when inserting paragraph)
   *                                 it should be restored to the end of the input
   */
  #handleDeleteInContentEditable(
    input: HTMLElement,
    key: DataKey,
    range: StaticRange,
    isRestoreCaretToTheEnd: boolean = false
  ): void {
    let start: number;
    let end: number;
    let newCaretIndex: number | null = null;

    // console.log('delete in input', input);

    /**
     * If range is fully contained within this input
     */
    if (this.#isInputContainsWholeSelection(input, range)) {
      // console.log('range is fully contained within this input');

      start = getAbsoluteRangeOffset(input, range.startContainer, range.startOffset);
      end = getAbsoluteRangeOffset(input, range.endContainer, range.endOffset);

      this.#model.removeText(this.#config.userId, this.#blockIndex, key, start, end);

      // newCaretIndex = start;
    } else if (this.#isInputContainsOnlyStartOfSelection(input, range)) {
      // console.log('only start is in this input');
      /**
       * If only start is in this input, delete from start to end of input
       */
      start = getAbsoluteRangeOffset(input, range.startContainer, range.startOffset);
      end = input.textContent?.length ?? 0;

      this.#model.removeText(this.#config.userId, this.#blockIndex, key, start, end);

      if (!isRestoreCaretToTheEnd) {
        newCaretIndex = start;
      }
    } else if (this.#isInputContainsOnlyEndOfSelection(input, range)) {
      // console.log('only end is in this input');
      /**
       * If only end is in this input, delete from start of input to end
      */
     start = 0;
     end = getAbsoluteRangeOffset(input, range.endContainer, range.endOffset);


     const removedText = this.#model.removeText(this.#config.userId, this.#blockIndex, key, start, end);
     if (isRestoreCaretToTheEnd) {
       newCaretIndex = end - removedText.length;
     }
    } else if (this.#isInputInBetweenSelection(input, range)) {
      // console.log('range spans across this input');
      /**
       * If range spans across this input, delete everything
       */
      start = 0;
      end = getAbsoluteRangeOffset(input, input, input.childNodes.length);
      this.#model.removeBlock(this.#config.userId, this.#blockIndex);
    }

    if (newCaretIndex !== null) {
      console.info('restore caret: block %o index %o caret %o', this.#blockIndex, newCaretIndex);
      this.#caretAdapter.updateIndex(
        new IndexBuilder()
          .addBlockIndex(this.#blockIndex)
          .addDataKey(key)
          .addTextRange([newCaretIndex, newCaretIndex])
          .build()
      );
    }
  }

  /**
   * Handles beforeinput event from user input and updates model data
   *
   * We prevent beforeinput event of any type to handle it manually via model update
   *
   * @param payload - payload of input event
   * @param input - input element
   * @param key - data key input is attached to
   */
  #handleBeforeInputEvent(payload: BeforeInputUIEventPayload, input: HTMLElement, key: DataKey): void {
    const { data, inputType, targetRanges } = payload;
    const range = targetRanges[0];

    const isInputNative = isNativeInput(input);
    let start: number;
    let end: number;

    switch (inputType) {
      case InputType.InsertReplacementText:
      case InputType.InsertFromDrop:
      case InputType.InsertFromPaste: {
        if (data && input.contains(range.startContainer)) {
          start = isInputNative ?
            (input as HTMLInputElement | HTMLTextAreaElement).selectionStart as number :
            getAbsoluteRangeOffset(input, range.startContainer, range.startOffset);

          this.#model.insertText(this.#config.userId, this.#blockIndex, key, data, start);
        }
        break;
      }
      case InputType.InsertText:
      /**
       * @todo Handle composition events
       */
      case InputType.InsertCompositionText: {
        if (data && input.contains(range.startContainer)) {
          start = isInputNative ?
            (input as HTMLInputElement | HTMLTextAreaElement).selectionStart as number :
            getAbsoluteRangeOffset(input, range.startContainer, range.startOffset);

          this.#model.insertText(this.#config.userId, this.#blockIndex, key, data, start);
        }
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
          this.#handleDeleteInNativeInput(payload, input as HTMLInputElement | HTMLTextAreaElement, key, range);
        } else {
          this.#handleDeleteInContentEditable(input, key, range);
        }
        break;
      }

      case InputType.InsertParagraph:
        console.log('insert paragraph', input);

        if (isInputNative) {
          // start = (input as HTMLInputElement | HTMLTextAreaElement).selectionStart as number;
          this.#handleDeleteInNativeInput(payload, input as HTMLInputElement | HTMLTextAreaElement, key, range);
        } else {
          this.#handleDeleteInContentEditable(input, key, range, true);
          // start = getAbsoluteRangeOffset(input, range.startContainer, range.startOffset);
        }

        /**
         *
         */
        if (
          (this.#isInputContainsOnlyStartOfSelection(input, range) || this.#isInputContainsWholeSelection(input, range)) &&
          !payload.isCrossInputSelection
        ) {
          const start = isInputNative ?
            (input as HTMLInputElement | HTMLTextAreaElement).selectionStart as number :
            getAbsoluteRangeOffset(input, range.startContainer, range.startOffset);

          this.#handleSplit(key, start, start);
        }
        break;
      case InputType.InsertLineBreak:
        /**
         * @todo Think if we need to keep that or not
         */
        if (isInputNative && input.contains(range.startContainer)) {
          start = (input as HTMLInputElement | HTMLTextAreaElement).selectionStart as number;
          this.#model.insertText(this.#config.userId, this.#blockIndex, key, '\n', start);
        }
        break;
      default:
    }
  }

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
      fragment.range[0] = Math.max(0, fragment.range[0] - end);
      fragment.range[1] -= end;
    });

    this.#model.removeText(this.#config.userId, this.#blockIndex, key, start, currentValue.length);
    this.#model.addBlock(
      this.#config.userId,
      {
        name: this.#toolName,
        data: {
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
   */
  #handleModelUpdateForNativeInput(event: ModelEvents, input: HTMLInputElement | HTMLTextAreaElement): void {
    const { textRange } = event.detail.index;

    const currentElement = input;
    const [start, end] = textRange!;

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

    this.#caretAdapter.updateIndex(caretIndexBuilder.build(), event.detail.userId);
  };

  /**
   * Handles model update events for contenteditable elements and updates DOM
   *
   * @param event - model update event
   * @param input - input element
   * @param key - data key input is attached to
   */
  #handleModelUpdateForContentEditableElement(event: ModelEvents, input: HTMLElement, key: DataKey): void {
    const { textRange } = event.detail.index;
    const action = event.detail.action;

    const [start, end] = textRange!;

    const [startNode, startOffset] = getBoundaryPointByAbsoluteOffset(input, start);
    const [endNode, endOffset] = getBoundaryPointByAbsoluteOffset(input, end);
    const range = new Range();

    range.setStart(startNode, startOffset);

    const builder = new IndexBuilder();

    builder.addDataKey(key).addBlockIndex(this.#blockIndex);

    let newCaretIndex: number | null = null;

    switch (action) {
      case EventAction.Added: {
        const text = event.detail.data as string;
        const textNode = document.createTextNode(text);

        range.insertNode(textNode);

        newCaretIndex = start + text.length;
        break;
      }
      case EventAction.Removed: {
        range.setEnd(endNode, endOffset);

        range.deleteContents();

        break;
      }
    }

    input.normalize();

    if (newCaretIndex !== null) {
      builder.addTextRange([newCaretIndex, newCaretIndex]);
      this.#caretAdapter.updateIndex(builder.build(), this.#config.userId);
    }
  };

  /**
   * Handles model update events and updates DOM
   *
   * @param event - model update event
   */
  #handleModelUpdate(event: ModelEvents): void {
    if (event instanceof BlockAddedEvent || event instanceof BlockRemovedEvent) {
      if (event.detail.index.blockIndex! <= this.#blockIndex) {
        this.#blockIndex += event.detail.action === EventAction.Added ? 1 : -1;
      }

      return;
    }

    const { textRange, dataKey, blockIndex } = event.detail.index;

    if (blockIndex !== this.#blockIndex) {
      return;
    }


    if (event instanceof DataNodeRemovedEvent) {
      this.detachInput(dataKey as string);

      return;
    }

    if (event instanceof DataNodeAddedEvent) {
      /**
       * @todo Decide how to handle this case as only BlockTool knows how to render an input
       */
    }

    if (!(event instanceof TextAddedEvent) && !(event instanceof TextRemovedEvent)) {
      return;
    }

    const input = this.#attachedInputs.get(dataKey!);

    if (!input || textRange === undefined) {
      return;
    }

    const isInputNative = isNativeInput(input);

    if (isInputNative === true) {
      this.#handleModelUpdateForNativeInput(event, input as HTMLInputElement | HTMLTextAreaElement);
    } else {
      this.#handleModelUpdateForContentEditableElement(event, input, dataKey!);
    }
  };
}
