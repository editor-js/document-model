
import type {
  EditorJSModel,
  InlineFragment,
  InlineToolData,
  InlineToolName,
  ModelEvents
} from '@editorjs/model';
import {
  EventType,
  TextFormattedEvent,
  TextUnformattedEvent
} from '@editorjs/model';
import type { CaretAdapter } from '../CaretAdapter/index.js';
import { FormattingAction } from '@editorjs/model';
import type { InlineTool } from '@editorjs/sdk';
import { surround } from '../utils/surround.js';
import { getBoundaryPointByAbsoluteOffset } from '../utils/getRelativeIndex.js';
import { expandRangeNodeBoundary } from '../utils/expandRangeNodeBoundary.js';

/**
 * Class handles on format model events and renders inline tools
 * Applies format to the model
 */
export class FormattingAdapter {
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
   * Allows to render formatting inside a passed input
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
    const textRange = inlineFragment.range;

    const tool = this.#tools.get(toolName);

    if (tool === undefined) {
      throw new Error(`FormattingAdapter: tool ${toolName} is not attached`);
    };

    try {
      const inlineElement = tool.createWrapper(toolData);

      surround(inlineElement, input, textRange);
    } catch (e) {
      console.error('Error while formatting element content', e);
    }
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
   * Format model according to action formed by inline tool instance
   *
   * @param toolName - name of the tool whose format will be applied
   * @param data - data of the tool got from toolbar
   */
  public applyFormat(toolName: InlineToolName, data: InlineToolData): void {
    const index = this.#caretAdapter.userCaretIndex;

    if (index === null) {
      throw new Error('FormattingAdapter: caret index is outside of the input');
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
      throw new Error(`FormattingAdapter: tool ${toolName} is not attached`);
    }

    const fragments = this.#model.getFragments(blockIndex, dataKey, ...textRange, toolName);

    const { action, range } = tool.getFormattingOptions(textRange, fragments);

    switch (action) {
      case FormattingAction.Format:
        this.#model.format(blockIndex, dataKey, toolName, ...range, data);

        break;
      case FormattingAction.Unformat:
        this.#model.unformat(blockIndex, dataKey, toolName, ...range);

        break;
    }
  }

  /**
   * Handles text format and unformat model events
   *
   * @param event - model change event
   */
  #handleModelUpdates(event: ModelEvents): void {
    if (event instanceof TextFormattedEvent || event instanceof TextUnformattedEvent) {
      const tool = this.#tools.get(event.detail.data.tool);
      const { textRange, blockIndex, dataKey } = event.detail.index;

      if (tool === undefined || textRange === undefined || blockIndex === undefined || dataKey === undefined) {
        return;
      }

      const input = this.#caretAdapter.getInput(event.detail.index);

      if (input === undefined) {
        console.warn('No input found for the index', event.detail.index);

        return;
      }

      const affectedFragments = this.#model.getFragments(blockIndex, dataKey, ...textRange);

      let lowerBoundary = textRange[0];
      let upperBoundary = textRange[1];

      for (const fragment of affectedFragments) {
        lowerBoundary = Math.min(lowerBoundary, fragment.range[0] ?? 0);
        upperBoundary = Math.max(upperBoundary, fragment.range[1] ?? 0);
      }

      this.#rerenderRange(input, lowerBoundary, upperBoundary, affectedFragments);
    }
  }

  /**
   * Apply formatting of all affected fragments to the range with boundaries
   *
   * @param input - input element to apply formatting to
   * @param lowerBoundary - lower boundary of the range
   * @param upperBoundary - upper boundary of the range
   * @param affectedFragments - model fragments that are used to format the range
   */
  #rerenderRange(input: HTMLElement, lowerBoundary: number, upperBoundary: number, affectedFragments: InlineFragment[]): void {
    const range = document.createRange();
    const [startNode, startOffset] = getBoundaryPointByAbsoluteOffset(input, lowerBoundary);
    const [endNode, endOffset] = getBoundaryPointByAbsoluteOffset(input, upperBoundary);

    if (startOffset === 0) {
      range.setStartBefore(expandRangeNodeBoundary(startNode));
    } else {
      range.setStart(startNode, startOffset);
    }

    if (endOffset === 1) {
      range.setEndAfter(expandRangeNodeBoundary(endNode, true));
    } else {
      range.setEnd(endNode, endOffset);
    }

    const extractedContent = range.extractContents();

    /**
     * Create temporary container to allow formatting of the extracted content
     */
    const template = document.createElement('template');

    template.innerHTML = extractedContent.textContent!;

    for (const fragment of affectedFragments) {
      const tool = this.#tools.get(fragment.tool);

      if (tool === undefined) {
        continue;
      }

      const relativeStart = fragment.range[0] - lowerBoundary;
      const relativeEnd = fragment.range[1] - lowerBoundary;

      /**
       * Create wrapper element for the fragment
       */
      const wrapper = tool.createWrapper(fragment.data);

      surround(wrapper, template.content, [relativeStart, relativeEnd]);
    }

    range.insertNode(template.content);
  }
}
