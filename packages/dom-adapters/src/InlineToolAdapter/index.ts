import type {
  DataKey,
  EditorJSModel,
  InlineFragment,
  InlineToolData,
  InlineToolName,
  ModelEvents,
  TextRange
} from '@editorjs/model';
import { EventType, TextFormattedEvent, TextUnformattedEvent } from '@editorjs/model';
import { unwrapByToolType, createRange, normalizeNode } from '../utils/index.js';
import type { CaretAdapter } from '../caret/CaretAdapter.js';

export interface InlineTool {
  name: InlineToolName;
  create(data?: InlineToolData): HTMLElement;
  getAction(index: TextRange, fragments: InlineFragment[], data?: InlineToolData): { action: FormattingAction; range: TextRange };
}

export enum FormattingAction {
  Format = 'format',
  Unformat = 'unformat',
}

/**
 * InlineToolAdapter class is used to connect InlineTools with the EditorJS model and apply changes into the DOM
 */
export class InlineToolAdapter {
  /**
   * Map of InlineTools
   *
   * @private
   *
   * @todo Replace any with InlineTool type
   */
  #tools: Map<InlineToolName, InlineTool> = new Map();

  /**
   * EditorJS model
   *
   * @private
   */
  #model: EditorJSModel;

  /**
   * Index of the block in the EditorJS model inline tool is related to
   *
   * @private
   */
  #blockIndex: number;

  /**
   * Key of the data in the BlockNode inline tool is related to
   *
   * @private
   */
  #dataKey: DataKey;

  /**
   * Input element inline tool is related to
   *
   * @private
   */
  #input: HTMLElement;

  /**
   * Caret adapter instance for the input
   */
  #caretAdapter: CaretAdapter;

  /**
   * InlineToolAdapter constructor
   *
   * @param model - EditorJS model
   * @param blockIndex - index of the block in the EditorJS model inline tool is related to
   * @param dataKey - key of the data in the BlockNode inline tool is related to
   * @param input - input element inline tool is related to
   */
  constructor(model: EditorJSModel, blockIndex: number, dataKey: DataKey, input: HTMLElement, caretAdapter: CaretAdapter) {
    this.#model = model;
    this.#blockIndex = blockIndex;
    this.#dataKey = dataKey;
    this.#input = input;
    this.#caretAdapter = caretAdapter;

    this.#subscribe();
  }

  /**
   * Attaches InlineTool to the adapter
   * Adds tool to the tools map
   *
   * @param tool
   *
   * @todo Replace any with InlineTool type
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

  public applyFormat(toolName: InlineToolName, data: InlineToolData): void {
    const index = this.#caretAdapter.getIndex();

    if (index === null) {
      console.warn('InlineToolAdapter: caret index is outside of the input');

      return;
    }

    const tool = this.#tools.get(toolName);

    if (!tool) {
      console.warn(`InlineToolAdapter: tool ${toolName} is not attached`);

      return;
    }

    const fragments = this.#model.getFragments(this.#blockIndex, this.#dataKey, ...index, toolName);

    const { action, range } = tool.getAction(index, fragments, data);

    switch (action) {
      case FormattingAction.Format:
        this.#model.format(this.#blockIndex, this.#dataKey, toolName, ...range, data);

        break;
      case FormattingAction.Unformat:
        this.#model.unformat(this.#blockIndex, this.#dataKey, toolName, ...range);

        break;
    }
  }

  /**
   * Subscribes to the EditorJS model events to apply fomratting to the DOM
   */
  #subscribe(): void {
    this.#model.addEventListener(EventType.Changed, (event: ModelEvents) => {
      if (!(event instanceof TextFormattedEvent || event instanceof TextUnformattedEvent)) {
        return;
      }

      const {
        index,
        data,
      } = event.detail;

      if (!this.#tools.has(data.tool)) {
        return;
      }

      const tool = this.#tools.get(data.tool)!;
      const wrappedTool = tool.create(data.data);

      wrappedTool.dataset.tool = data.tool;

      const [start, end] = index[0];

      const range = createRange(this.#input, start, end);

      /**
       * Apply formatting to the input
       */
      if (event instanceof TextFormattedEvent) {
        const extracted = range.extractContents();

        range.insertNode(extracted);

        range.surroundContents(wrappedTool);
      }

      /**
       * Remove formatting from the input
       */
      if (event instanceof TextUnformattedEvent) {
        unwrapByToolType(range, data.tool);
      }

      normalizeNode(this.#input);
      this.#input.normalize();
    });
  }
}
