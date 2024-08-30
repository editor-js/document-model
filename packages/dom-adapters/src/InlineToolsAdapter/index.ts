
import type {
  EditorJSModel,
  InlineFragment,
  InlineToolData,
  InlineToolName,
  ModelEvents
} from '@editorjs/model';
import { createInlineToolData } from '@editorjs/model';
import {
  EventType,
  TextFormattedEvent
} from '@editorjs/model';
import type { CaretAdapter } from '../CaretAdapter/index.js';
import { FormattingAction } from '@editorjs/model';
import type { InlineTool, InlineToolFormatData, DataFormElementWithOptions } from '@editorjs/sdk';

/**
 * Class handles on format model events and renders inline tools
 * Applies format to the model
 */
export class InlineToolsAdapter {
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
   * @todo move event handling to BlockToolAdapter
   * Handles text format and unformat model events
   *
   * @param event - model change event
   */
  #handleModelUpdates(event: ModelEvents): void {
    if (event instanceof TextFormattedEvent) {
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

        const inlineElement = tool.createWrapper(event.detail.data.data);

        const extracted = range.extractContents();

        /**
         * Insert contents from range to new inline element and put created element in range
         */
        inlineElement.appendChild(extracted);

        range.insertNode(inlineElement);
      }
    }
  }

  /**
   * Format content of the contenteditable element
   *
   * @param input - input element to apply format to
   * @param inlineFragment - instance that contains index, toolName and toolData
   * @param inlineFragment.index - text range inside of the input element
   * @param inlineFragment.toolName - name of the tool, which format to apply
   * @param inlineFragment.toolData - additional data for the tool
   */
  public formatElementContent(input: HTMLElement, inlineFragment: InlineFragment): void {
    const toolName = inlineFragment.tool;
    const toolData = inlineFragment.data;
    const index = inlineFragment.range;

    const tool = this.#tools.get(toolName);

    if (tool === undefined) {
      throw new Error(`InlineToolAdapter: tool ${toolName} is not attached`);
    }

    const [start, end] = index;

    /**
     * Create range with positions specified in index
     */
    const range = document.createRange();

    range.setStart(input, start);
    range.setEnd(input, end);

    const inlineElement = tool.createWrapper(toolData);

    const extracted = range.extractContents();

    /**
     * Insert contents from range to new inline element and put created element in range
     */
    inlineElement.appendChild(extracted);

    range.insertNode(inlineElement);
  }

  /**
   * Attaches InlineTool to the adapter
   *
   * @param toolName - name of the tool to be attached
   * @param tool - tool to attach
   */
  public attachTool(toolName: InlineToolName, tool: InlineTool): void {
    this.#tools.set(toolName, tool);
  }

  /**
   * Detaches InlineTool from the adapter
   *
   * @param toolName - name of the tool to be detached
   */
  public detachTool(toolName: InlineToolName): void {
    this.#tools.delete(toolName);
  }

  /**
   * Function that checks if data required for current tool
   * If data required - return rendered by tool data form element with options required in toolbar
   * If data is not required - trigger callback
   *
   * @param toolName - name of the tool to check if data is required
   * @param callback - callback function that should be triggered, when data completely formed
   * @returns {DataFormElementWithOptions | null} rendered data form element with options required in toolbar or null if no data required
   */
  public formatData(toolName: InlineToolName, callback: (data: InlineToolFormatData) => void): DataFormElementWithOptions | null {
    const currentTool = this.#tools.get(toolName);

    if (currentTool === undefined) {
      throw new Error(`InlineToolAdapter: tool ${toolName} was not attached`);
    }

    /**
     * If createDataFormElement method specified, render element and return it
     */
    if (currentTool.createDataFormElement !== undefined) {
      return currentTool.createDataFormElement(callback);
    }
    /**
     * If createDataFormElement method is not specidied, then no data required for the tool
     * Trigger callback
     */
    callback(createInlineToolData({}));

    return null;
  }

  /**
   * Format model according to action formed by inline tool instance
   *
   * @param toolName - name of the tool whose format will be applied
   * @param data - data of the tool got from toolbar
   */
  public applyFormat(toolName: InlineToolName, data: InlineToolData): void {
    const index = this.#caretAdapter.userCaretIndex;

    if (index === null) {
      throw new Error('InlineToolsAdapter: caret index is outside of the input');
    }

    const textRange = index.textRange;
    const blockIndex = index.blockIndex;
    const dataKey = index.dataKey;


    if (textRange === undefined) {
      throw new Error ('TextRange of the index should be defined. Probably something wrong with the Editor Model. Please, report this issue');
    }
    if (blockIndex === undefined) {
      throw new Error ('BlockIndex should be defined. Probably something wrong with the Editor Model. Please, report this issue');
    }
    if (dataKey === undefined) {
      throw new Error ('DataKey of the index should be defined. Probably something wrong with the Editor Model. Please, report this issue');
    }

    const tool = this.#tools.get(toolName);

    if (tool === undefined) {
      throw new Error(`InlineToolsAdapter: tool ${toolName} is not attached`);
    }

    const fragments = this.#model.getFragments(blockIndex, dataKey, ...textRange, toolName);

    const { action, range } = tool.getAction(textRange, fragments);

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
