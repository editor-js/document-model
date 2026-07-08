import 'reflect-metadata';
import { EditorJSModel } from '@editorjs/model';
import type { BlockNodeSerialized, InlineFragment } from '@editorjs/sdk';
import {
  CaretManagerCaretUpdatedEvent,
  CaretManagerEvents,
  CoreConfigValidated,
  createInlineToolData,
  EventBus,
  EventType,
  FormattingAction,
  Index,
  IndexBuilder,
  IndexError,
  InlineToolFormatData,
  InlineToolName,
  SelectionChangedCoreEvent
} from '@editorjs/sdk';
import { inject, injectable } from 'inversify';
import { TOKENS } from '../tokens.js';
import ToolsManager from '../tools/ToolsManager.js';

/**
 * SelectionManager responsible for handling selection changes and applying inline tools formatting
 */
@injectable()
export class SelectionManager {
  /**
   * Editor model instance
   * Used for interactions with stored data
   */
  #model: EditorJSModel;

  /**
   * EventBus instance to exchange events between components
   */
  #eventBus: EventBus;

  /**
   * Editor's config
   */
  #config: CoreConfigValidated;

  /**
   * Editor's Tools manager instance
   */
  #toolsManager: ToolsManager;

  /**
   * @param config - Editor's config
   * @param model - editor model instance
   * @param eventBus - EventBus instance to exchange events between components
   * @param toolsManager - Editor's tools manager
   */
  constructor(
    @inject(TOKENS.EditorConfig) config: CoreConfigValidated,
    model: EditorJSModel,
    eventBus: EventBus,
    toolsManager: ToolsManager
  ) {
    this.#config = config;
    this.#model = model;
    this.#eventBus = eventBus;
    this.#toolsManager = toolsManager;

    this.#model.addEventListener(EventType.CaretManagerUpdated, (event: CaretManagerEvents) => this.#handleCaretManagerUpdate(event));
  }

  /**
   * Handle changes of the caret selection
   * @param event - CaretManager event
   */
  #handleCaretManagerUpdate(event: CaretManagerEvents): void {
    if (event.detail.userId !== this.#config.userId) {
      return;
    }

    switch (true) {
      case event instanceof CaretManagerCaretUpdatedEvent: {
        const { index: serializedIndex } = event.detail;

        const index = serializedIndex !== null ? Index.parse(serializedIndex) : null;
        let fragments: InlineFragment[] = [];

        if (index !== null) {
          for (const segment of index.getTextSegments()) {
            if (segment.blockIndex !== undefined && segment.dataKey !== undefined && segment.textRange !== undefined) {
              fragments.push(
                ...this.#model.getFragments(segment.blockIndex, segment.dataKey, ...segment.textRange)
              );
            }
          }
        }

        this.#eventBus.dispatchEvent(new SelectionChangedCoreEvent({
          index,
          /**
           * @todo implement filter by current BlockTool configuration
           */
          availableInlineTools: Array.from(
            this.#toolsManager
              .inlineTools
              .values()
          ),
          fragments,
        }));

        break;
      }
    }
  }

  /**
   * Returns index of current user's caret (selection) or null
   */
  public get currentSelection(): Readonly<Index> | null {
    const userCaret = this.#model.getCaret(this.#config.userId);

    return userCaret?.index ?? null;
  }

  /**
   * Apply format with data formed in toolbar
   * @param params - method parameters, see comments to the param types
   */
  public applyInlineTool({
    toolName,
    data = {},
    userId = this.#config.userId,
    caretIndex = this.currentSelection,
    keepSelection = true,
    action: actionOverride,
  }: {
    /** Name of the inline tool to apply */
    toolName: InlineToolName;
    /** Inline tool formatting data */
    data?: InlineToolFormatData;
    /** ID of the user applying the change */
    userId?: string | number;
    /** Caret index to apply formatting for */
    caretIndex?: Readonly<Index> | null;
    /** Optional action override for formatting/unformatting */
    action?: FormattingAction;
    /** If true, Manager will restore the selection after applying the tool. True by default */
    keepSelection?: boolean;
  }): void {
    if (caretIndex === null) {
      throw new IndexError('SelectionManager[applyInlineTool]: caret index is outside of the input');
    }

    const caret = this.#model.getCaret(userId);

    /**
     * @todo do not store middle segments in the index, use only the first and last segments
     * Also, we need to sort inputs inside first/last block by document order to restore selection
     */
    const segments = caretIndex.getTextSegments();

    if (segments.length === 0) {
      throw new IndexError('SelectionManager[applyInlineTool]: caret index is outside of the input');
    }

    const tool = this.#toolsManager.inlineTools.get(toolName)?.create();

    /**
     * @todo think of config synchronisation. If remote user has some tools current user doesn't there's going to be mismatch in the data
     */
    if (tool === undefined) {
      throw new Error(`SelectionManager[applyInlineTool]: tool ${toolName} is not attached`);
    }

    for (const segment of segments) {
      const textRange = segment.textRange;
      const blockIndex = segment.blockIndex;
      const dataKey = segment.dataKey;

      if (textRange === undefined) {
        throw new IndexError('TextRange of the index should be defined. Probably something wrong with the Editor Model. Please, report this issue');
      }

      if (blockIndex === undefined) {
        throw new IndexError('BlockIndex should be defined. Probably something wrong with the Editor Model. Please, report this issue');
      }

      if (dataKey === undefined) {
        throw new IndexError('DataKey of the index should be defined. Probably something wrong with the Editor Model. Please, report this issue');
      }

      const fragments = this.#model.getFragments(blockIndex, dataKey, ...textRange, toolName);

      const { action, range } = tool.getFormattingOptions(textRange, fragments);

      switch (actionOverride ?? action) {
        case FormattingAction.Format:
          this.#model.format(userId, blockIndex, dataKey, toolName, ...range, createInlineToolData(data));

          break;
        case FormattingAction.Unformat:
          this.#model.unformat(userId, blockIndex, dataKey, toolName, ...range);

          break;
      }

      /**
       * Keep selection param is applied only for the current user
       */
      if (userId === this.#config.userId) {
        if (keepSelection) {
          caret?.update(caretIndex);
        } else {
          // For composite selections, don't try to add textRange since composite indices
          // must not have root-level textRange. Only set textRange for single-segment selections.
          const selectedSegments = caretIndex.getTextSegments();

          if (selectedSegments.length === 1 && selectedSegments[0].textRange !== undefined) {
            caret?.update(
              new IndexBuilder()
                .from(caretIndex)
                .addTextRange([selectedSegments[0].textRange[1], selectedSegments[0].textRange[1]])
                .build()
            );
          } else {
            caret?.update(caretIndex);
          }
        }
      }
    }
  };

  /**
   * Returns an array of selected blocks using the current selection index
   */
  public selectedBlocks(): BlockNodeSerialized[] {
    const currentSelectionIndex = this.currentSelection;

    if (currentSelectionIndex === null) {
      return [];
    }

    if (currentSelectionIndex.isBlockIndex) {
      const { blockIndex } = currentSelectionIndex;

      return [this.#model.serialized.blocks[blockIndex!]];
    }

    if (currentSelectionIndex.compositeSegments !== undefined) {
      return currentSelectionIndex.compositeSegments.map((segment) => {
        const { blockIndex } = segment;

        return this.#model.serialized.blocks[blockIndex!];
      });
    }

    return [];
  }
}
