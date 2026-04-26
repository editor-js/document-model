import {
  createDataKey,
  type DataKey,
  EditorJSModel,
  EventAction,
  IndexBuilder,
  type ModelEvents,
  TextAddedEvent,
  TextRemovedEvent
} from '@editorjs/model';
import type {
  BeforeInputUIEvent,
  BeforeInputUIEventPayload,
  CoreConfig
} from '@editorjs/sdk';
import { BeforeInputUIEventName, BlockToolAdapter,
  EventBus } from '@editorjs/sdk';
import { CaretAdapter } from '../CaretAdapter/index.js';
import { FormattingAdapter } from '../FormattingAdapter/index.js';
import {
  getAbsoluteRangeOffset,
  getBoundaryPointByAbsoluteOffset,
  getClippedTextRangeForInput,
  isInputContainsOnlyEndOfSelection,
  isInputContainsOnlyStartOfSelection,
  isInputContainsWholeSelection,
  isInputInBetweenSelection
} from '../utils/index.js';
import { InputType } from './types/InputType.js';
import { inject, injectable } from 'inversify';
import { TOKENS } from '../tokens.js';
import { InputsRegistry } from '../InputsRegistry/index.js';

/**
 * BlockToolAdapter is using inside Block tools to connect browser DOM elements to the model
 * It can handle beforeinput events and update model data
 * It can handle model's change events and update DOM
 */
@injectable('Transient')
export class DOMBlockToolAdapter extends BlockToolAdapter {
  /**
   * Name of the tool that this adapter is connected to
   */
  #toolName: string = '';

  #caretAdapter: CaretAdapter;
  #formattingAdapter: FormattingAdapter;
  #inputsRegistry: InputsRegistry;

  /**
   * BlockToolAdapter constructor
   * @param config - Editor's config
   * @param model - EditorJSModel instance
   * @param eventBus - Editor EventBus instance
   * @param caretAdapter - CaretAdapter instance
   * @param formattingAdapter - needed to render formatted text
   * @param registry - shared inputs registry
   */
  constructor(
    @inject(TOKENS.EditorConfig) config: Required<CoreConfig>,
    model: EditorJSModel,
    eventBus: EventBus,
    caretAdapter: CaretAdapter,
    formattingAdapter: FormattingAdapter,
    registry: InputsRegistry
  ) {
    super(config, model, eventBus);

    this.#caretAdapter = caretAdapter;
    this.#formattingAdapter = formattingAdapter;
    this.#inputsRegistry = registry;

    /**
     * @todo Needs to be documented. If UI module is replaced and doesn't dispatch the event nothing would work
     */
    eventBus.addEventListener(`ui:${BeforeInputUIEventName}`, (event: BeforeInputUIEvent) => {
      this.#processDelegatedBeforeInput(event);
    });
  }

  /**
   * Sets tool name for the adapter
   * @todo think how to remove the name dependency
   * @param name - tool name
   */
  public setToolName(name: string): void {
    this.#toolName = name;
  }

  /**
   * Attaches or re-attaches input to the model using key
   * It handles beforeinput events and updates model data
   * @param keyRaw - tools data key to attach input to
   * @param input - input element
   */
  public setInput(keyRaw: string, input: HTMLElement | undefined): void {
    const key = createDataKey(keyRaw);

    if (input === undefined) {
      this.#inputsRegistry.unregister(this.blockIndex, key);

      return;
    }

    if (!(input instanceof HTMLElement)) {
      throw new Error('Input should be an HTML element');
    }

    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
      throw new Error('Native inputs such as HTMLInput or HTMLTextArea are not supported. Please provide an HTMLElement with contendEditable property set to \'true\'');
    }

    const existingInput = this.#attachedInputs.get(key);

    if (existingInput === input) {
      return;
    }

    const value = this.model.getText(this.blockIndex, key);
    const fragments = this.model.getFragments(this.blockIndex, key);

    this.#inputsRegistry.register(this.blockIndex, key, input);

    input.textContent = value;

    fragments.forEach((fragment) => {
      this.#formattingAdapter.formatElementContent(input, fragment);
    });
  }

  /**
   * Returns the (dataKey → element) map for this block from the shared registry.
   */
  get #attachedInputs(): Map<DataKey, HTMLElement> {
    return this.#inputsRegistry.getBlockInputs(this.blockIndex) ?? new Map<DataKey, HTMLElement>();
  }

  /**
   * @todo - move to sdk BlockToolAdapter interface if it would be used
   * Public getter for all attached inputs.
   * Can be used to loop through all inputs to find a particular input(s)
   */
  public getAttachedInputs(): Map<DataKey, HTMLElement> {
    return this.#attachedInputs;
  }

  /**
   * @todo - move to sdk BlockToolAdapter interface if it would be used
   * Allows access to a particular input by key
   * @param key - data key of the input
   */
  public getInput(key: DataKey): HTMLElement | undefined {
    return this.#attachedInputs.get(key);
  }

  /**
   * Check current selection and find all inputs that contain target ranges
   * @param targetRanges - ranges to find inputs for
   * @returns array of tuples containing data key and input element
   */
  #findInputsByRanges(targetRanges: StaticRange[]): [DataKey, HTMLElement][] {
    return Array.from(this.#attachedInputs.entries()).filter(([_, input]) => {
      return targetRanges.some((range) => {
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
          const endPosition = endContainer.compareDocumentPosition(input);

          const isBetween = (
            Boolean(startPosition & Node.DOCUMENT_POSITION_FOLLOWING)
            && Boolean(endPosition & Node.DOCUMENT_POSITION_PRECEDING)
          );

          return isBetween;
        }

        /**
         * Case 2: Input is a contenteditable element — check if it's between start and end
         */
        if (input.isContentEditable) {
          /**
           * Case 2.1 — input contains either start  or end of selection
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
            Boolean(startPosition & Node.DOCUMENT_POSITION_FOLLOWING)
            && Boolean(endPosition & Node.DOCUMENT_POSITION_PRECEDING)
          );

          return isBetween;
        }

        return false;
      });
    });
  }

  /**
   * Handles 'beforeinput' event delegated from the blocks host element
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
   * Handles delete events in contenteditable element
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
    /**
     * Middle block in a cross-input selection: remove the whole block, not the same as removeText(0, length).
     */
    if (isInputInBetweenSelection(input, range)) {
      this.model.removeBlock(this.config.userId, this.blockIndex);

      return;
    }

    /**
     * `beforeinput` exposes `StaticRange`; {@link getClippedTextRangeForInput} expects a `Range`
     * so we can call `intersectsNode` and reuse the same clipping logic as the selection pipeline.
     */
    const docRange = document.createRange();

    docRange.setStart(range.startContainer, range.startOffset);
    docRange.setEnd(range.endContainer, range.endOffset);

    const clipped = getClippedTextRangeForInput(docRange, input);

    /**
     * No overlap between the selection range and this `input`,
     * so there is no text span to delete here. Unusual in this
     * path: delete is usually for the field that owns the selection. Possible if `beforeinput` is
     * tied to one block while the range only touches another (focus / event target mismatch), or a rare
     * browser edge case.
     */
    if (clipped === null) {
      return;
    }

    const [start, end] = clipped;
    const removedText = this.model.removeText(this.config.userId, this.blockIndex, key, start, end);

    let newCaretIndex: number | null = null;

    if (!isRestoreCaretToTheEnd) {
      /**
       * Default mode: place the caret where the deletion started.
       * Applies when the input owns the start of the selection, or when
       * the entire selection falls inside this input (whole-selection delete).
       * Also covers the case where the input owns only the end of a cross-input
       * selection — the remaining text has shifted to `start` (= 0 for a
       * leading-edge clip), so that is the correct landing position.
       */
      newCaretIndex = start;
    } else if (isInputContainsOnlyEndOfSelection(input, range)) {
      /**
       * InsertParagraph / split mode: the caller wants the caret at the end
       * of the surviving text in the input that held the selection end.
       */
      newCaretIndex = end - removedText.length;
    }

    if (newCaretIndex !== null) {
      this.#caretAdapter.updateIndex(
        new IndexBuilder()
          .addBlockIndex(this.blockIndex)
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
   * @param payload - payload of input event
   * @param input - input element
   * @param key - data key input is attached to
   */
  #handleBeforeInputEvent(payload: BeforeInputUIEventPayload, input: HTMLElement, key: DataKey): void {
    const { data, inputType, targetRanges } = payload;
    const range = targetRanges[0];
    const isFormattingInputType = inputType.startsWith('format');

    let start: number;

    /**
     * @todo support input merging
     */

    /**
     * In all cases (except formatting commands) we need to handle delete selected text if range is not collapsed.
     */
    if (range.collapsed === false && !isFormattingInputType) {
      this.#handleDeleteInContentEditable(input, key, range);
    }

    switch (inputType as InputType) {
      case InputType.InsertReplacementText:
      case InputType.InsertFromDrop:
      case InputType.InsertFromPaste: {
        if (data !== undefined && input.contains(range.startContainer)) {
          start = getAbsoluteRangeOffset(input, range.startContainer, range.startOffset);

          this.model.insertText(this.config.userId, this.blockIndex, key, data, start);
        }
        break;
      }
      case InputType.InsertText:
      /**
       * @todo Handle composition events
       */
      case InputType.InsertCompositionText: {
        if (data !== undefined && input.contains(range.startContainer)) {
          start = getAbsoluteRangeOffset(input, range.startContainer, range.startOffset);

          this.model.insertText(this.config.userId, this.blockIndex, key, data, start);
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
        /**
         * We already handle delete above
         */
        break;
      }

      case InputType.InsertParagraph:

        /**
         * In case of cross-input selection we don't need to split the block, just remove range
         */
        if (
          (isInputContainsOnlyStartOfSelection(input, range) || isInputContainsWholeSelection(input, range))
          && payload.isCrossInputSelection === false
        ) {
          start = getAbsoluteRangeOffset(input, range.startContainer, range.startOffset);

          this.#handleSplit(key, start, start);
        }
        break;
      case InputType.InsertLineBreak:
        /**
         * @todo hanlde insert linebreak for content editable elements
         */
        break;
      default:
    }
  }

  /**
   * Splits the current block's data field at the specified index
   * Removes selected range if it's not collapsed
   * Sets caret to the beginning of the next block
   * @param key - data key to split
   * @param start - start index of the split
   * @param end - end index of the selected range
   */
  #handleSplit(key: DataKey, start: number, end: number): void {
    const currentValue = this.model.getText(this.blockIndex, key);
    const newValueAfter = currentValue.slice(end);

    const relatedFragments = this.model.getFragments(this.blockIndex, key, end, currentValue.length);

    /**
     * Fragment ranges bounds should be decreased by end index, because end is the index of the first character of the new block
     */
    relatedFragments.forEach((fragment) => {
      fragment.range[0] = Math.max(0, fragment.range[0] - end);
      fragment.range[1] -= end;
    });

    this.model.removeText(this.config.userId, this.blockIndex, key, start, currentValue.length);
    this.model.addBlock(
      this.config.userId,
      {
        /**
         * @todo when implementing split/merge, think of how to not use toolname here
         */
        name: this.#toolName,
        data: {
          [key]: {
            $t: 't',
            value: newValueAfter,
            fragments: relatedFragments,
          },
        },
      },
      this.blockIndex + 1
    );

    /**
     * Raf is needed to ensure that the new block is added so caret can be moved to it
     */
    requestAnimationFrame(() => {
      this.#caretAdapter.updateIndex(
        new IndexBuilder()
          .addBlockIndex(this.blockIndex + 1)
          .addDataKey(key)
          .addTextRange([0, 0])
          .build()
      );
    });
  }

  /**
   * Handles model update events for contenteditable elements and updates DOM
   * @param event - model update event
   * @param input - input element
   * @param key - data key input is attached to
   */
  #handleModelUpdateForContentEditableElement(event: ModelEvents, input: HTMLElement, key: DataKey): void {
    const { userId, index, action } = event.detail;
    const { textRange } = index;

    const [start, end] = textRange!;

    const [startNode, startOffset] = getBoundaryPointByAbsoluteOffset(input, start);
    const [endNode, endOffset] = getBoundaryPointByAbsoluteOffset(input, end);
    const range = new Range();

    range.setStart(startNode, startOffset);

    const builder = new IndexBuilder();

    builder.addDataKey(key).addBlockIndex(this.blockIndex);

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
      this.#caretAdapter.updateIndex(builder.build(), userId);
    }
  };

  /**
   * Handles model update events and updates DOM
   * @param event - model update event
   */
  protected handleModelUpdate(event: ModelEvents): void {
    if (!(event instanceof TextAddedEvent) && !(event instanceof TextRemovedEvent)) {
      return;
    }

    const { textRange, dataKey } = event.detail.index;

    const input = this.#attachedInputs.get(dataKey!);

    if (!input || textRange === undefined) {
      return;
    }

    this.#handleModelUpdateForContentEditableElement(event, input, dataKey!);
  };
}
