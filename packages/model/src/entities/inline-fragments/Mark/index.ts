import type { InlineToolData, InlineToolName } from '@editorjs/model-types';
import { isSameInlineData } from '../../../utils/index.js';

/**
 * Inline tool with its data applied to a piece of text.
 * Immutable, so the same instance can be shared between runs
 */
export class Mark {
  /**
   * Name of the inline tool
   */
  public readonly tool: InlineToolName;

  /**
   * Inline tool data if applicable
   */
  public readonly data?: InlineToolData;

  /**
   * Mark constructor
   * @param tool - name of the inline tool
   * @param [data] - inline tool data if applicable
   */
  constructor(tool: InlineToolName, data?: InlineToolData) {
    this.tool = tool;
    this.data = data;
  }

  /**
   * Checks if the passed mark is equal to this one: same tool and equal data
   * @param mark - mark to compare with
   */
  public equals(mark: Mark): boolean {
    return this.tool === mark.tool && isSameInlineData(this.data, mark.data);
  }
}
