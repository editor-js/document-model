import 'reflect-metadata';
import {
  CaretManagerEvents,
  createInlineToolData,
  FormattingAction,
  InlineFragment,
  InlineToolName
} from '@editorjs/model';
import { CaretManagerCaretUpdatedEvent, Index, EditorJSModel, createInlineToolName } from '@editorjs/model';
import { EventType } from '@editorjs/model';
import {
  EventBus,
  SelectionChangedCoreEvent, IndexError, CoreConfigValidated
} from '@editorjs/sdk';
import { inject, injectable } from 'inversify';
import { TOKENS } from '../tokens.js';
import { InlineToolFormatData } from '@editorjs/sdk';
import ToolsManager from '../tools/ToolsManager';

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
          availableInlineTools: new Map(
            this.#toolsManager
              .inlineTools
              .entries()
              .map(([name, facade]) => [createInlineToolName(name), facade.create()])
          ),
          fragments,
        }));

        break;
      }
    }
  }

  /**
   * Apply format with data formed in toolbar
   * @param toolName - name of the inline tool, whose format would be applied
   * @param data - fragment data for the current selection
   */
  public applyInlineToolForCurrentSelection(toolName: InlineToolName, data: InlineToolFormatData = {}): void {
    /**
     * @todo use inline tool data formed in toolbar
     */
    const userCaret = this.#model.getCaret(this.#config.userId);

    const index = userCaret?.index ?? null;

    if (index === null) {
      throw new IndexError('SelectionManager[applyInlineToolForCurrentSelection]: caret index is outside of the input');
    }

    /**
     * @todo do not store middle segments in the index, use only the first and last segments
     * Also, we need to sort inputs inside first/last block by document order to restore selection
     */
    const segments = index.getTextSegments();

    if (segments.length === 0) {
      throw new IndexError('SelectionManager[applyInlineToolForCurrentSelection]: caret index is outside of the input');
    }

    const tool = this.#toolsManager.inlineTools.get(toolName)?.create();

    /**
     * @todo think of config synchronisation. If remote user has some tools current user doesn't there's going to be mismatch in the data
     */
    if (tool === undefined) {
      throw new Error(`SelectionManager[applyInlineToolForCurrentSelection]: tool ${toolName} is not attached`);
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

      switch (action) {
        case FormattingAction.Format:
          this.#model.format(this.#config.userId, blockIndex, dataKey, toolName, ...range, createInlineToolData(data));

          break;
        case FormattingAction.Unformat:
          this.#model.unformat(this.#config.userId, blockIndex, dataKey, toolName, ...range);

          break;
      }
    }
  };
}
