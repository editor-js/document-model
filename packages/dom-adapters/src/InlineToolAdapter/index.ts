import {
  DataKey,
  EditorJSModel,
  InlineFragment,
  InlineToolData,
  InlineToolName,
  ModelEvents,
  TextRange
} from '@editorjs/model';
import type { CaretAdapter } from '../CaretAdapter/index.js';
import { IntersectType, FormattingAction } from '@editorjs/model/src/entities/inline-fragments/FormattingInlineNode/types';
// import { intersectionExists } from '../utils/intersectExists.js';
// import { mergeTextRanges } from '../utils/mergeTextRanges.js';

export interface InlineTool {
  name: InlineToolName;
  create(data?: InlineToolData): HTMLElement;
  getAction(index: TextRange, fragments: InlineFragment[], intersectType: IntersectType, data?: InlineToolData): { action: FormattingAction; range: TextRange };
}

export class InlineToolAdapter {
  #model: EditorJSModel;

  #tools: Map<InlineToolName, InlineTool> = new Map();
  
  /**
   * Caret adapter instance for the input
   */
  #caretAdapter: CaretAdapter;

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

  constructor(model: EditorJSModel, blockIndex: number, dataKey: DataKey, caretAdapter: CaretAdapter) {
    this.#model = model;
    this.#caretAdapter = caretAdapter;
    this.#blockIndex = blockIndex;
    this.#dataKey = dataKey;
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

  public applyFormat(toolName: InlineToolName, data: InlineToolData, intersectType: IntersectType): void {
    const index = this.#caretAdapter.getIndex();

    if (index === null) {
      throw new Error('InlineToolAdapter: caret index is outside of the input');
    }

    let start = index[0];
    let end = index[1];

    const tool = this.#tools.get(toolName);

    if (!tool) {
      throw new Error(`InlineToolAdapter: tool ${toolName} is not attached`);
    }

    const fragments = this.#model.getFragments(this.#blockIndex, this.#dataKey, ...index, toolName);

    const { action, range } = tool.getAction(index, fragments, intersectType, data);

    switch (action) {
      case FormattingAction.Format:
        this.#model.format(this.#blockIndex, this.#dataKey, toolName, ...range, data);

        break;
      case FormattingAction.Unformat:
        this.#model.unformat(this.#blockIndex, this.#dataKey, toolName, ...range);

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
