import 'reflect-metadata';
import { FormattingAdapter } from '@editorjs/dom-adapters';
import type { CaretManagerEvents, InlineFragment, InlineToolName } from '@editorjs/model';
import { CaretManagerCaretUpdatedEvent, Index, EditorJSModel, createInlineToolData, createInlineToolName } from '@editorjs/model';
import { EventType } from '@editorjs/model';
import { CoreEventType, ToolLoadedCoreEvent, EventBus, SelectionChangedCoreEvent } from '@editorjs/sdk';
import { Inject, Service } from 'typedi';
import { type CoreConfig, InlineTool, InlineToolFormatData } from '@editorjs/sdk';

/**
 * SelectionManager responsible for handling selection changes and applying inline tools formatting
 */
@Service()
export class SelectionManager {
  /**
   * Editor model instance
   * Used for interactions with stored data
   */
  #model: EditorJSModel;

  /**
   * FormattingAdapter instance
   * Used for inline tools attaching and format apply
   */
  #formattingAdapter: FormattingAdapter;

  /**
   * EventBus instance to exchange events between components
   */
  #eventBus: EventBus;

  /**
   * Inline Tools instances available for use
   */
  #inlineTools: Map<InlineToolName, InlineTool> = new Map();

  /**
   * Editor's config
   */
  #config: CoreConfig;

  /**
   * @param config - Editor's config
   * @param model - editor model instance
   * @param formattingAdapter - needed for applying format to the model
   * @param eventBus - EventBus instance to exchange events between components
   */
  constructor(
    @Inject('EditorConfig') config: CoreConfig,
    model: EditorJSModel,
    formattingAdapter: FormattingAdapter,
    eventBus: EventBus
  ) {
    this.#config = config;
    this.#model = model;
    this.#formattingAdapter = formattingAdapter;
    this.#eventBus = eventBus;

    this.#eventBus.addEventListener(`core:${CoreEventType.ToolLoaded}`, (event: ToolLoadedCoreEvent) => {
      const { tool } = event.detail;

      if ('isInline' in tool && tool.isInline() === false) {
        return;
      }

      const toolInstance = tool.create();
      const name = createInlineToolName(tool.name);

      this.#inlineTools.set(name, toolInstance);

      this.#formattingAdapter.attachTool(name, toolInstance);
    });

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

        if (index !== null && index.blockIndex !== undefined && index.dataKey !== undefined && index.textRange !== undefined) {
          fragments = this.#model.getFragments(index.blockIndex, index.dataKey, ...index.textRange);
        }

        this.#eventBus.dispatchEvent(new SelectionChangedCoreEvent({
          index,
          /**
           * @todo implement filter by current BlockTool configuration
           */
          availableInlineTools: this.#inlineTools,
          fragments,
        }));

        break;
      }
      default:
        break;
    }
  }

  /**
   * Apply format with data formed in toolbar
   * @param toolName - name of the inline tool, whose format would be applied
   * @param data - fragment data for the current selection
   */
  public applyInlineToolForCurrentSelection(toolName: InlineToolName, data: InlineToolFormatData = {}): void {
    /**
     * @todo pass to applyFormat inline tool data formed in toolbar
     */
    this.#formattingAdapter.applyFormat(toolName, createInlineToolData(data));
  };
}
