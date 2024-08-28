import type { InlineTool } from '@editorjs/dom-adapters';
import type { InlineFragment, TextRange } from '@editorjs/model';
import { FormattingAction } from '@editorjs/model';
import { createInlineToolName, IntersectType, type InlineToolName } from '@editorjs/model';
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

  public name: InlineToolName = createInlineToolName('Bold');

  public intersectType: IntersectType = IntersectType.Extend;

  /**
   * Renders wrapper for tool without actual content
   * @returns Created html element
   */
  public create(): HTMLElement {
    return make('b');
  }

  /**
   * Returns formatting action and range for it to be applied
   * @param index - index of current text selection
   * @param fragments - all fragments of the bold inline tool inside of the current input
   */
  public getAction(index: TextRange, fragments: InlineFragment[]): {
    /**
     * Formatting action - format or unformat
     */
    action: FormattingAction;

    /**
     * Range to apply formatting action
     */
    range: TextRange;
  } {
    return {
      action: this.checkState(index, fragments) ? FormattingAction.Format : FormattingAction.Unformat,
      range: index,
    };
  };

  /**
   * Returns state of the bold inline tool
   * @param index - index of current selection
   * @param fragments - all fragments of the bold inline tool inside of the current input
   * @returns true if tool is active, false otherwise
   */
  public checkState(index: TextRange, fragments: InlineFragment[]): boolean {
    let isActive = false;

    fragments.forEach((fragment) => {
      /**
       * Check if current index is inside of model fragment
       */
      if (index[0] >= fragment.range[0] && index[1] <= fragment.range[1]) {
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
