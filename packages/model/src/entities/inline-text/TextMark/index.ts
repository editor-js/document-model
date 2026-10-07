import type { InlineToolData, InlineToolName } from '@editorjs/model-types';
import { cloneInlineData, isSameInlineData } from '../../../utils/index.js';

/**
 * Inline tool with its data applied to a piece of text.
 *
 * Immutable, so the same instance can be shared between runs. The mark keeps its own copy of the data,
 * so changes to the object passed in don't reach the model. Empty data is stored as no data,
 * since the two are equal and the stored form must not depend on which one was passed
 */
export class TextMark {
  /**
   * Name of the inline tool
   */
  public readonly tool: InlineToolName;

  /**
   * Inline tool data if applicable
   */
  public readonly data?: InlineToolData;

  /**
   * TextMark constructor
   * @param tool - name of the inline tool
   * @param [data] - inline tool data if applicable
   */
  constructor(tool: InlineToolName, data?: InlineToolData) {
    this.tool = tool;
    this.data = data === undefined || TextMark.#isEmpty(data) ? undefined : cloneInlineData(data);
  }

  /**
   * Checks if the passed mark is equal to this one: same tool and equal data
   * @param mark - mark to compare with
   */
  public equals(mark: TextMark): boolean {
    return this.tool === mark.tool && isSameInlineData(this.data, mark.data);
  }

  /**
   * Checks if the data is an empty object
   * @param data - inline tool data
   */
  static #isEmpty(data: InlineToolData): boolean {
    return Object.keys(data).length === 0;
  }
}
