import type { ToolFormattingOptions, InlineTool } from '@editorjs/sdk';
import type { InlineFragment, TextRange } from '@editorjs/model';
import { FormattingAction } from '@editorjs/model';
import { IntersectType } from '@editorjs/model';
import { make } from '@editorjs/dom';

/**
 * Bold Tool
 *
 * Inline Toolbar Tool
 *
 * Makes selected text bolder
 */
export default class BoldInlineTool implements InlineTool {
  /**
   * Specifies Tool as Inline Toolbar Tool
   * @returns {boolean}
   */
  public static isInline = true;

  /**
   * Type of behaviour of the tool if new selection range intersect with existing fragment
   * If two fragment intersect, they should be merged
   */
  public intersectType: IntersectType = IntersectType.Extend;

  /**
   * Renders wrapper for tool without actual content
   * @returns Created html element
   */
  public createWrapper(): HTMLElement {
    return make('b');
  }

  /**
   * Returns formatting action and range for it to be applied
   * @param range - range of current text selection
   * @param fragments - all fragments of the bold inline tool inside of the current input
   */
  public getFormattingOptions(range: TextRange, fragments: InlineFragment[]): ToolFormattingOptions {
    return {
      action: this.isActive(range, fragments) ? FormattingAction.Unformat : FormattingAction.Format,
      range,
    };
  };

  /**
   * Returns state of the bold inline tool
   * @param range - range of current selection
   * @param fragments - all fragments of the bold inline tool inside of the current input
   * @returns true if tool is active, false otherwise
   */
  public isActive(range: TextRange, fragments: InlineFragment[]): boolean {
    let isActive = false;

    fragments.forEach((fragment) => {
      /**
       * Check if current index is inside of model fragment
       */
      if (range[0] >= fragment.range[0] && range[1] <= fragment.range[1]) {
        isActive = true;

        /**
         * No need to check other fragments if state already chaned
         */
        return;
      }
    });

    return isActive;
  }
}
