import type { FormattingActionWithRange, InlineTool } from '@editorjs/sdk';
import type { InlineFragment, TextRange } from '@editorjs/model';
import { FormattingAction } from '@editorjs/model';
import { IntersectType } from '@editorjs/model';
import { make } from '@editorjs/dom';

/**
 * Italic Tool
 *
 * Inline Toolbar Tool
 *
 * Makes selected text italic
 */
export default class ItalicInlineTool implements InlineTool {
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
    return make('i');
  }

  /**
   * Returns formatting action and range for it to be applied
   * @param index - index of current text selection
   * @param fragments - all fragments of the bold inline tool inside of the current input
   */
  public getFormattingOptions(index: TextRange, fragments: InlineFragment[]): FormattingActionWithRange {
    return {
      action: this.isActive(index, fragments) ? FormattingAction.Unformat : FormattingAction.Format,
      range: index,
    };
  };

  /**
   * Returns state of the bold inline tool
   * @param index - index of current selection
   * @param fragments - all fragments of the bold inline tool inside of the current input
   * @returns true if tool is active, false otherwise
   */
  public isActive(index: TextRange, fragments: InlineFragment[]): boolean {
    let isActive = false;

    fragments.forEach((fragment) => {
      /**
       * Check if current index is inside of model fragment
       */
      if (index[0] >= fragment.range[0] && index[1] <= fragment.range[1]) {
        isActive = true;

        /**
         * Don't need to check other fragments if state already chaned
         */
        return;
      }
    });

    return isActive;
  }
}
