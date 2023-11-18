import type { DataKey, EditorJSModel, InlineToolData, InlineToolName, ModelEvents } from '@editorjs/model';
import { EventType, TextFormattedEvent, TextUnformattedEvent } from '@editorjs/model';
import { getAbsoluteOffset, getRange, normalize, unwrapByToolType } from '../utils/helpers.js';


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
  #tools: Map<InlineToolName, any> = new Map();

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
   * InlineToolAdapter constructor
   *
   * @param model - EditorJS model
   * @param blockIndex - index of the block in the EditorJS model inline tool is related to
   * @param dataKey - key of the data in the BlockNode inline tool is related to
   * @param input - input element inline tool is related to
   */
  constructor(model: EditorJSModel, blockIndex: number, dataKey: DataKey, input: HTMLElement) {
    this.#model = model;
    this.#blockIndex = blockIndex;
    this.#dataKey = dataKey;
    this.#input = input;

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
  public attachTool(tool: any): void {
    this.#tools.set(tool.name, tool);
  }

  /**
   * Detaches InlineTool from the adapter
   *
   * @param tool - tool to detach
   */
  public detachTool(tool: any): void {
    this.#tools.delete(tool.name);
  }

  /**
   * Applies formatting to the input using current selection
   *
   * @param tool - name of the tool to apply
   * @param [data] - inline tool data if applicable
   */
  public format(tool: InlineToolName, data?: InlineToolData): void;
  /**
   * Applies formatting to the input using specified range
   *
   * @param tool - name of the tool to apply
   * @param start - char start index of the range
   * @param end - char end index of the range
   * @param [data] - inline tool data if applicable
   */
  public format(tool: InlineToolName, start: number, end: number, data?: InlineToolData): void;
  /**
   * General declaration
   *
   * @param args - arguments
   */
  public format(...args: [InlineToolName, number | InlineToolData | undefined, number?, InlineToolData?]): void {
    let tool: InlineToolName, start: number, end: number, data: InlineToolData | undefined;

    if (args.length < 3) {
      tool = args[0];
      data = args[1] as InlineToolData | undefined;

      const selection = window.getSelection();

      if (!selection || selection.rangeCount === 0) {
        return;
      }

      const range = selection?.getRangeAt(0);

      const comparison = range.compareBoundaryPoints(Range.START_TO_END, range);

      if (comparison >= 0) {
        start = getAbsoluteOffset(this.#input, range.startContainer, range.startOffset);
        end = getAbsoluteOffset(this.#input, range.endContainer, range.endOffset);
      } else {
        start = getAbsoluteOffset(this.#input, range.endContainer, range.endOffset);
        end = getAbsoluteOffset(this.#input, range.startContainer, range.startOffset);
      }
    } else {
      tool = args[0];
      start = args[1] as number;
      end = args[2] as number;
      data = args[3] as InlineToolData | undefined;
    }


    this.#model.format(this.#blockIndex, this.#dataKey, tool, start, end, data);
  }

  /**
   *  Removes formatting from the input using current selection
   *
   * @param tool - name of the tool to remove formatting for
   */
  public unformat(tool: InlineToolName): void;
  /**
   * Removes formatting from the input using specified range
   *
   * @param tool - name of the tool to remove formatting for
   * @param start - char start index of the range
   * @param end - char end index of the range
   */
  public unformat(tool: InlineToolName, start: number, end: number): void;
  /**
   * General declaration
   * @param args - arguments
   */
  public unformat(...args: [InlineToolName, number?, number?]): void {
    let tool: InlineToolName, start: number, end: number;

    if (args.length === 1) {
      tool = args[0];

      const selection = window.getSelection();

      if (!selection || selection.rangeCount === 0) {
        return;
      }

      const range = selection?.getRangeAt(0);

      const comparison = range.compareBoundaryPoints(Range.START_TO_END, range);

      if (comparison >= 0) {
        start = getAbsoluteOffset(this.#input, range.startContainer, range.startOffset);
        end = getAbsoluteOffset(this.#input, range.endContainer, range.endOffset);
      } else {
        start = getAbsoluteOffset(this.#input, range.endContainer, range.endOffset);
        end = getAbsoluteOffset(this.#input, range.startContainer, range.startOffset);
      }
    } else {
      tool = args[0];
      start = args[1] as number;
      end = args[2] as number;
    }

    this.#model.unformat(this.#blockIndex, this.#dataKey, tool, start, end);
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

      const tool = this.#tools.get(data.tool);
      const wrappedTool = tool.create(data.data);

      wrappedTool.dataset.tool = data.tool;

      const [start, end] = index[0];

      const range = getRange(this.#input, start, end);

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

      normalize(this.#input);
      this.#input.normalize();
    });
  }
}
