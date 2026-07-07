import type {
  InlineFragment,
  InlineToolName,
  ModelEvents
} from '@editorjs/sdk';
import {
  createInlineToolName
} from '@editorjs/sdk';
import {
  TextFormattedEvent,
  TextUnformattedEvent
} from '@editorjs/sdk';
import { CaretAdapter } from '../CaretAdapter/index.js';
import type { CoreConfig, EditorAPI, InlineTool, ToolLoadedCoreEvent } from '@editorjs/sdk';
import { CoreEventType, EventBus } from '@editorjs/sdk';
import { surround } from '../utils/surround.js';
import { getBoundaryPointByAbsoluteOffset } from '../utils/getRelativeIndex.js';
import { expandRangeNodeBoundary } from '../utils/expandRangeNodeBoundary.js';
import { inject, injectable } from 'inversify';
import { TOKENS } from '../tokens.js';

/**
 * Class handles on format model events and renders inline tools
 * Applies format to the model
 */
@injectable()
export class FormattingAdapter {
  /**
   * Editor's API
   */
  #api: EditorAPI;

  /**
   * Tools, attached to the inline tool adapter
   */
  #tools: Map<InlineToolName, InlineTool> = new Map();

  /**
   * Caret adapter instance for the input
   */
  #caretAdapter: CaretAdapter;

  /**
   * @param api - Editor's API
   * @param caretAdapter - caret adapter instance
   * @param eventBus - Editor's EventBus instance
   */
  constructor(
    @inject(TOKENS.EditorAPI) api: EditorAPI,
    caretAdapter: CaretAdapter,
    eventBus: EventBus
  ) {
    this.#api = api;
    this.#caretAdapter = caretAdapter;

    /**
     * @todo maybe expose some limited information about tools via API so we don't need to store tools in the formatting adapter
     */
    eventBus.addEventListener(`core:${CoreEventType.ToolLoaded}`, (event: ToolLoadedCoreEvent) => {
      const { tool } = event.detail;

      if ('isInline' in tool && tool.isInline() === false) {
        return;
      }

      const toolInstance = tool.create();
      const name = createInlineToolName(tool.name);

      this.attachTool(name, toolInstance);
    });

    /**
     * Add event listener for model changes
     */
    this.#api.document.onUpdate((event: ModelEvents) => this.#handleModelUpdates(event));
  }

  /**
   * Allows to render formatting inside a passed input
   * @param input - input element to apply format to
   * @param inlineFragment - instance that contains index, toolName and toolData
   * @param inlineFragment.index - text range inside the input element
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
    }

    try {
      const inlineElement = tool.createWrapper(toolData);

      surround(inlineElement, input, textRange);
    } catch (e) {
      console.error('Error while formatting element content', e);
    }
  }

  /**
   * Attaches an inline tool instance for formatting / DOM wrapping.
   * Keyboard shortcuts are handled by the Shortcuts core plugin via Selection API.
   * @param toolName - model inline tool name (from `createInlineToolName` in `@editorjs/model`)
   * @param tool - inline tool instance
   */
  public attachTool(toolName: InlineToolName, tool: InlineTool): void {
    this.#tools.set(toolName, tool);
  }

  /**
   * Detaches InlineTool from the adapter
   * @param toolName - name of the tool to be detached
   */
  public detachTool(toolName: InlineToolName): void {
    this.#tools.delete(toolName);
  }

  /**
   * Handles text format and unformat model events
   * @param event - model change event
   */
  #handleModelUpdates(event: ModelEvents): void {
    if (!(event instanceof TextFormattedEvent || event instanceof TextUnformattedEvent)) {
      return;
    }

    const tool = this.#tools.get(event.detail.data.tool);
    const { textRange, blockIndex, dataKey } = event.detail.index;

    if (tool === undefined || textRange === undefined || blockIndex === undefined || dataKey === undefined) {
      return;
    }
    const input = this.#caretAdapter.findInput(blockIndex, dataKey.toString());

    if (input === undefined) {
      console.warn('No input found for the index', event.detail.index);

      return;
    }
    const inputContent = input.textContent;
    const rangeStart = Math.max(0, textRange[0] - 1);
    const rangeEnd = inputContent !== null ? Math.min(inputContent.length, textRange[1] + 1) : 0;
    const affectedFragments = this.#api.text.getFragments({
      block: blockIndex,
      key: dataKey as string,
      start: rangeStart,
      end: rangeEnd,
    });
    const leftBoundary = affectedFragments[0]?.range[0] ?? textRange[0];
    let rightBoundary = textRange[1];

    for (const fragment of affectedFragments) {
      rightBoundary = Math.max(rightBoundary, fragment.range[1]);
    }
    this.#rerenderRange(input, leftBoundary, rightBoundary, affectedFragments);
  }

  /**
   * Apply formatting of all affected fragments to the range with boundaries
   * @param input - input element to apply formatting to
   * @param leftBoundary - lower boundary of the range
   * @param rightBoundary - upper boundary of the range
   * @param affectedFragments - model fragments that are used to format the range
   */
  #rerenderRange(input: HTMLElement, leftBoundary: number, rightBoundary: number, affectedFragments: InlineFragment[]): void {
    const range = document.createRange();
    const [startNode, startOffset] = getBoundaryPointByAbsoluteOffset(input, leftBoundary);
    const [endNode, endOffset] = getBoundaryPointByAbsoluteOffset(input, rightBoundary);

    if (startOffset === 0) {
      range.setStartBefore(expandRangeNodeBoundary(startNode));
    } else {
      range.setStart(startNode, startOffset);
    }

    if (endOffset === endNode.textContent!.length) {
      range.setEndAfter(expandRangeNodeBoundary(endNode, true));
    } else {
      range.setEnd(endNode, endOffset);
    }

    /**
     * Create temporary container to allow formatting of the extracted content
     */
    const template = document.createElement('template');

    template.innerHTML = range.toString()!;

    for (const fragment of affectedFragments) {
      const tool = this.#tools.get(fragment.tool);

      if (tool === undefined) {
        continue;
      }

      const relativeStart = fragment.range[0] - leftBoundary;
      const relativeEnd = fragment.range[1] - leftBoundary;

      /**
       * Create wrapper element for the fragment
       */
      const wrapper = tool.createWrapper(fragment.data);

      surround(wrapper, template.content, [relativeStart, relativeEnd]);
    }

    range.extractContents();
    range.insertNode(template.content);
  }
}
