import { isNativeInput } from '@editorjs/dom';
import {
  type Caret,
  type CaretManagerEvents,
  EditorJSModel,
  EventType,
  Index,
  IndexBuilder,
  createDataKey
} from '@editorjs/model';
import type { CoreConfig } from '@editorjs/sdk';
import {
  getAbsoluteRangeOffset,
  getBoundaryPointByAbsoluteOffset,
  getClippedTextRangeForInput,
  useSelectionChange
} from '../utils/index.js';
import { inject, injectable } from 'inversify';
import { TOKENS } from '../tokens.js';
import { InputsRegistry } from '../InputsRegistry/index.js';

/**
 * Caret adapter watches selection change and saves it to the model
 *
 * On model update, it updates the selection in the DOM
 */
@injectable()
export class CaretAdapter {
  /**
   * Editor.js DOM container
   */
  #container: HTMLElement;

  /**
   * Editor.js model
   */
  #model: EditorJSModel;

  /**
   * Shared inputs registry — single source of truth for (blockIndex, dataKey) → HTMLElement.
   * Both BlockToolAdapter and CaretAdapter operate on the same registry instance.
   */
  #inputsRegistry: InputsRegistry;

  /**
   * Current user's caret
   */
  #currentUserCaret: Caret;

  /**
   * Editor's config
   */
  #config: Required<CoreConfig>;

  /**
   * @class
   * @param config - Editor's config
   * @param model - Editor.js model
   * @param registry - shared inputs registry
   */
  constructor(
    @inject(TOKENS.EditorConfig) config: Required<CoreConfig>,
      model: EditorJSModel,
      registry: InputsRegistry
  ) {
    this.#config = config;
    this.#model = model;
    this.#inputsRegistry = registry;
    this.#container = config.holder;
    this.#currentUserCaret = this.#model.createCaret(this.#config.userId);

    const { on } = useSelectionChange();

    /**
     * @todo Unsubscribe on adapter destruction
     */
    on(this.#container, (selection) => this.#onSelectionChange(selection), this);

    this.#model.addEventListener(EventType.CaretManagerUpdated, (event) => this.#onModelCaretUpdate(event));
  }

  /**
   * Getter for internal caret index of the user
   */
  public get userCaretIndex(): Index | null {
    return this.#currentUserCaret.index;
  }


  /**
   * Updates current user's caret index
   *
   * @param index - new caret index
   * @param [userId] - user identifier
   */
  public updateIndex(index: Index | null, userId?: string | number): void {
    if (userId === undefined) {
      this.#currentUserCaret.update(index);

      return;
    }


    const caretToUpdate = this.#model.getCaret(userId);

    if (caretToUpdate === undefined) {
      return;
    }

    caretToUpdate.update(index);
  }

  /**
   * Finds input by block index and data key
   *
   * @param blockIndex - index of the block
   * @param dataKeyRaw - data key of the input
   * @returns input element or undefined if not found
   */
  public findInput(blockIndex: number, dataKeyRaw: string): HTMLElement | undefined {
    return this.#inputsRegistry.getInput(blockIndex, createDataKey(dataKeyRaw));
  }

  /**
   * Restores a multi-block selection from a composite caret index (cross-input selection).
   *
   * @param index - composite index with {@link Index.compositeSegments}
   */
  #restoreDomSelectionFromCompositeIndex(index: Index): void {
    const segments = index.compositeSegments;

    if (segments === undefined || segments.length === 0) {
      return;
    }

    const first = segments[0];
    const last = segments[segments.length - 1];

    if (
      first.textRange === undefined ||
      first.dataKey === undefined ||
      first.blockIndex === undefined ||
      last.textRange === undefined ||
      last.dataKey === undefined ||
      last.blockIndex === undefined
    ) {
      return;
    }

    const startInput = this.findInput(first.blockIndex, first.dataKey.toString());
    const endInput = this.findInput(last.blockIndex, last.dataKey.toString());

    if (startInput === undefined || endInput === undefined) {
      return;
    }

    if (isNativeInput(startInput) === true || isNativeInput(endInput) === true) {
      return;
    }

    const selection = document.getSelection()!;

    const startBoundary = getBoundaryPointByAbsoluteOffset(startInput, first.textRange[0]);
    const endBoundary = getBoundaryPointByAbsoluteOffset(endInput, last.textRange[1]);

    if (selection.rangeCount > 0) {
      const current = selection.getRangeAt(0);

      if (
        current.startContainer === startBoundary[0] &&
        current.startOffset === startBoundary[1] &&
        current.endContainer === endBoundary[0] &&
        current.endOffset === endBoundary[1]
      ) {
        return;
      }
    }

    const range = new Range();

    range.setStart(...startBoundary);
    range.setEnd(...endBoundary);

    selection.removeAllRanges();
    selection.addRange(range);
  }

  /**
   * Selection change handler
   *
   * @param selection - new document selection
   */
  #onSelectionChange(selection: Selection | null): void {
    if (!selection || selection.rangeCount === 0) {
      this.updateIndex(null);

      return;
    }

    const selectionRange = selection.getRangeAt(0);
    const segments: Index[] = [];

    for (const [blockIndex, dataKeyStr, input] of this.#inputsRegistry.entries()) {
      if (isNativeInput(input) === true) {
        continue;
      }

      const textRange = getClippedTextRangeForInput(selectionRange, input);

      if (textRange === null) {
        continue;
      }

      const builder = new IndexBuilder();

      builder
        .addBlockIndex(blockIndex)
        .addDataKey(createDataKey(dataKeyStr))
        .addTextRange(textRange);

      segments.push(builder.build());
    }

    /**
     * {@link #inputsRegistry} iteration order follows insertion order; composite index and
     * {@link #restoreDomSelectionFromCompositeIndex} require segments ordered from selection start
     * to end (by {@link Index.blockIndex}, then DOM order of inputs within a block).
     */
    this.#sortCompositeSegmentsInDocumentOrder(segments);

    if (segments.length === 0) {
      this.updateIndex(null);

      return;
    }

    if (segments.length === 1) {
      this.updateIndex(segments[0]);

      return;
    }

    this.updateIndex(Index.fromCompositeSegments(segments));
  }

  /**
   * Orders text index segments by model position: {@link #blocks} order can lag after moves, but
   * composite indices and DOM restore assume {@link Index.compositeSegments}[0] is the start anchor
   * block and the last segment is the end anchor block. Within one block, inputs are ordered by
   * document order via {@link Node.compareDocumentPosition} (not by data key — registration order can
   * differ from layout).
   *
   * @param segments - mutable list of per-input segments (sorted in place)
   */
  #sortCompositeSegmentsInDocumentOrder(segments: Index[]): void {
    segments.sort((a, b) => {
      const blockA = a.blockIndex;
      const blockB = b.blockIndex;

      if (blockA !== blockB) {
        return (blockA ?? 0) - (blockB ?? 0);
      }

      const blockIndex = blockA ?? 0;
      const inputA =
        a.dataKey !== undefined ? this.findInput(blockIndex, String(a.dataKey)) : undefined;
      const inputB =
        b.dataKey !== undefined ? this.findInput(blockIndex, String(b.dataKey)) : undefined;

      if (inputA !== undefined && inputB !== undefined && inputA !== inputB) {
        const position = inputA.compareDocumentPosition(inputB);

        if ((position & Node.DOCUMENT_POSITION_CONTAINS) !== 0) {
          return -1;
        }

        if ((position & Node.DOCUMENT_POSITION_CONTAINED_BY) !== 0) {
          return 1;
        }

        if ((position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0) {
          return -1;
        }

        if ((position & Node.DOCUMENT_POSITION_PRECEDING) !== 0) {
          return 1;
        }
      }

      if (inputA !== undefined && inputB === undefined) {
        return -1;
      }

      if (inputA === undefined && inputB !== undefined) {
        return 1;
      }

      return 0;
    });
  }

  /**
   * Model updates handler
   *
   * - Finds input to set selection to by serialized index
   * - If current user's selection is different, set the one from the update
   *
   * @param event - model update event
   */
  #onModelCaretUpdate(event: CaretManagerEvents): void {
    const { index: serializedIndex } = event.detail;

    if (serializedIndex === null) {
      return;
    }

    const index = Index.parse(serializedIndex);
    const userId = event.detail.userId;

    if (userId !== this.#currentUserCaret.userId) {
      return;
    }

    if (index.compositeSegments !== undefined && index.compositeSegments.length > 0) {
      this.#restoreDomSelectionFromCompositeIndex(index);

      return;
    }

    const { textRange, dataKey, blockIndex } = index;

    if (textRange === undefined || dataKey === undefined || blockIndex === undefined) {
      return;
    }

    const input = this.findInput(blockIndex, dataKey.toString());

    if (!input) {
      return;
    }

    if (isNativeInput(input) === true) {
      const currentStart = (input as HTMLInputElement | HTMLTextAreaElement).selectionStart;
      const currentEnd = (input as HTMLInputElement | HTMLTextAreaElement).selectionEnd;

      /**
       * If selection is already the same, we don't need to update it to not interrupt browser's behaviour
       */
      if (currentStart === textRange[0] && currentEnd === textRange[1]) {
        return;
      }

      (input as HTMLInputElement | HTMLTextAreaElement).selectionStart = textRange[0];
      (input as HTMLInputElement | HTMLTextAreaElement).selectionEnd = textRange[1];

      return;
    }

    const selection = document.getSelection()!;

    let isStartEqualsCurrent = false;
    let isEndEqualsCurrent = false;

    const start = getBoundaryPointByAbsoluteOffset(input, textRange[0]);
    const end = getBoundaryPointByAbsoluteOffset(input, textRange[1]);

    /**
     * If selection is outside of the input, it is different from the model range
     */
    if (input.contains(selection.anchorNode!) && input.contains(selection.focusNode!)) {
      let absoluteStartOffset = getAbsoluteRangeOffset(input, selection.anchorNode!, selection.anchorOffset);
      let absoluteEndOffset = getAbsoluteRangeOffset(input, selection.focusNode!, selection.focusOffset);

      /**
       * For right-to-left selection, we need to swap start and end offsets to compare with model range
       */
      if (absoluteStartOffset > absoluteEndOffset) {
        [absoluteStartOffset, absoluteEndOffset] = [absoluteEndOffset, absoluteStartOffset];
      }

      isStartEqualsCurrent = textRange[0] === absoluteStartOffset;
      isEndEqualsCurrent = textRange[1] === absoluteEndOffset;
    }

    /**
     * If selection is already the same, we don't need to update it to not interrupt browser's behaviour
     */
    if (isStartEqualsCurrent && isEndEqualsCurrent) {
      return;
    }

    const range = new Range();

    range.setStart(...start);
    range.setEnd(...end);

    selection.removeAllRanges();
    selection.addRange(range);
  }
}
