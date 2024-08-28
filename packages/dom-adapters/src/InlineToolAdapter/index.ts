import type {
  EditorJSModel,
  InlineFragment,
  InlineToolData,
  InlineToolName,
  ModelEvents,
  TextRange
} from '@editorjs/model';
import {
  EventType,
  TextFormattedEvent,
  TextUnformattedEvent
} from '@editorjs/model';
import type { CaretAdapter } from '../CaretAdapter/index.js';
import { type IntersectType, FormattingAction } from '@editorjs/model';

export interface InlineTool {
  name: InlineToolName;
  intersectType: IntersectType,
  create(data?: InlineToolData): HTMLElement;
  getAction(index: TextRange, fragments: InlineFragment[], intersectType: IntersectType, data?: InlineToolData): { action: FormattingAction; range: TextRange };
}

/**
 * Class handles on format model events and renders inline tools
 * Applies format to the model
 */
export class InlineToolAdapter {
  /**
   * Editor model instance
   */
  #model: EditorJSModel;

  /**
   * Tools, attached to the inline tool adapter
   */
  #tools: Map<InlineToolName, InlineTool> = new Map();

  /**
   * Caret adapter instance for the input
   */
  #caretAdapter: CaretAdapter;

  /**
   * @class
   * @param model - editor model instance
   * @param caretAdapter - caret adapter instance
   */
  constructor(model: EditorJSModel, caretAdapter: CaretAdapter) {
    this.#model = model;
    this.#caretAdapter = caretAdapter;

    /**
     * Add event listener for model changes
     */
    this.#model.addEventListener(EventType.Changed, (event: ModelEvents) => this.#handleModelUpdates(event));
  }

  /**
   * Handles text format and unformat model events
   *
   * @param event - model change event
   */
  #handleModelUpdates(event: ModelEvents): void {
    if (event instanceof TextFormattedEvent || event instanceof TextUnformattedEvent) {
      const tool = this.#tools.get(event.detail.data.tool);

      if (tool === undefined) {
        return;
      }

      const selection = window.getSelection();

      /**
       * Render inline tool for current range
       */
      if (selection) {
        const range = selection.getRangeAt(0);

        const inlineElement = tool.create();

        /**
         * Insert contents from range to new inline element and put created element in range
         */
        inlineElement.appendChild(range.extractContents()); 
        range.insertNode(inlineElement);
      }
    }
  }

  /**
   * Attaches InlineTool to the adapter
   *
   * @param tool - tool to attach
   */
  public attachTool(tool: InlineTool): void {
    this.#tools.set(tool.name, tool);
  }

  /**
   * Detaches InlineTool from the adapter
   *
   * @param tool - tool to detach
   */
  public detachTool(tool: InlineTool): void {
    this.#tools.delete(tool.name);
  }

  /**
   * Applies format of the tool to the model
   *
   * @param toolName - name of the tool whose format will be applied
   * @param data - data of the tool got from toolbar
   * @param intersectType - type of the intersect
   */
  public applyFormat(toolName: InlineToolName, data: InlineToolData, intersectType: IntersectType): void {
    const index = this.#caretAdapter.userCaretIndex;

    if (index === null) {
      throw new Error('InlineToolAdapter: caret index is outside of the input');
    }

    const textRange = index.textRange!;
    const blockIndex = index.blockIndex!;
    const dataKey = index.dataKey!;

    const tool = this.#tools.get(toolName);

    if (!tool) {
      throw new Error(`InlineToolAdapter: tool ${toolName} is not attached`);
    }

    const fragments = this.#model.getFragments(blockIndex, dataKey, ...textRange, toolName);

    const { action, range } = tool.getAction(textRange, fragments, intersectType, data);

    switch (action) {
      case FormattingAction.Format:
        this.#model.format(blockIndex, dataKey, toolName, ...range, data);

        break;
      case FormattingAction.Unformat:
        this.#model.unformat(blockIndex, dataKey, toolName, ...range);

        break;
    }
  }
}
