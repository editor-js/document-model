import type {
  EditorJSModel,
  InlineFragment,
  InlineToolData,
  InlineToolName,
  ModelEvents,
  TextRange
} from '@editorjs/model';
import {
  DataKey,
  EventType,
  TextFormattedEvent,
  TextFormattedEventData,
  TextUnformattedEvent
} from '@editorjs/model';
import type { CaretAdapter } from '../CaretAdapter/index.js';
import type { IntersectType } from '@editorjs/model/src/entities/inline-fragments/FormattingInlineNode/types';
import { FormattingAction } from '@editorjs/model/src/entities/inline-fragments/FormattingInlineNode/types';
// import { intersectionExists } from '../utils/intersectExists.js';
// import { mergeTextRanges } from '../utils/mergeTextRanges.js';

export interface InlineTool {
  name: InlineToolName;
  intersectType: IntersectType,
  create(data?: InlineToolData): HTMLElement;
  getAction(index: TextRange, fragments: InlineFragment[], intersectType: IntersectType, data?: InlineToolData): { action: FormattingAction; range: TextRange };
}

/**
 *
 */
export class InlineToolAdapter {
  #model: EditorJSModel;

  #tools: Map<InlineToolName, InlineTool> = new Map();

  /**
   * Caret adapter instance for the input
   */
  #caretAdapter: CaretAdapter;

  /**
   *
   * @param model
   * @param caretAdapter
   */
  constructor(model: EditorJSModel, caretAdapter: CaretAdapter) {
    this.#model = model;
    this.#caretAdapter = caretAdapter;

    this.#model.addEventListener(EventType.Changed, (event: ModelEvents) => this.#handleModelUpdates(event));
  }

  /**
   *
   * @param event
   */
  #handleModelUpdates(event: ModelEvents/*, input: HTMLElement, key: DataKey */): void {
    if (event instanceof TextFormattedEvent || event instanceof TextUnformattedEvent) {
      const tool = this.#tools.get(event.detail.data.tool);

      if (tool === undefined) {
        return;
      }

      const selection = window.getSelection();

      if (selection) {
        const range = selection.getRangeAt(0);

        const inlineElement = tool.create();;

        range.surroundContents(inlineElement);
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
   *
   * @param toolName
   * @param data
   * @param intersectType
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
      // case (FormattingAction): {
      //   fragments.forEach((fragment: InlineFragment) => {

      //     /**
      //      * If start or end of current format range is in range of existing format range
      //      */
      //     if (intersectionExists(fragment.range, [start, end])) {
      //       /**
      //        * Update start and end of the
      //        */
      //       [ start, end ] = mergeTextRanges(fragment.range, [start, end]);
      //     };
      //   });

      //   break;
      // }
    }
  }
}
