import type { DataFormElementWithOptions, FormattingActionWithRange, InlineTool, InlineToolFormatData } from '@editorjs/sdk';
import type { InlineFragment, TextRange } from '@editorjs/model';
import { FormattingAction } from '@editorjs/model';
import { IntersectType } from '@editorjs/model';
import { make } from '@editorjs/dom';

/**
 * Link Tool
 *
 * Inline Toolbar Tool
 *
 * Makes selected text linked
 */
export default class LinkInlineTool implements InlineTool {
  /**
   * Specifies Tool as Inline Toolbar Tool
   * @returns {boolean}
   */
  public static isInline = true;

  /**
   * Type of behaviour of the tool if new selection range intersect with existing fragment
   * If two fragment intersect, existing fragment should be replaced with new one
   */
  public intersectType: IntersectType = IntersectType.Replace;

  /**
   * Renders wrapper for tool without actual content
   * @param data - inline tool data formed in toolbar
   * @returns Created html element
   */
  public createWrapper(data: InlineToolFormatData): HTMLElement {
    const linkElement = make('a') as HTMLLinkElement;

    if (typeof data.link === 'string') {
      linkElement.href = data.link;
    }

    return linkElement;
  }

  /**
   * Returns formatting action and range for it to be applied
   * @param index - index of current text selection
   * @param fragments - all fragments of the bold inline tool inside of the current input
   */
  public getAction(index: TextRange, fragments: InlineFragment[]): FormattingActionWithRange {
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
      if (index[0] === fragment.range[0] && index[1] === fragment.range[1]) {
        isActive = true;

        /**
         * No need to check other fragments if state already chaned
         */
        return;
      }
    });

    return isActive;
  }

  /**
   * Function that is responsible for rendering data form element
   * @param callback function that should be triggered, when data completely formed
   * @returns rendered data form element with options required in toolbar
   */
  public createDataFormElement(callback: (data: InlineToolFormatData) => void): DataFormElementWithOptions | null {
    const dataFormerElement = make('input') as HTMLInputElement;

    dataFormerElement.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        callback({ link: dataFormerElement.value });
      }
    });

    return { element: dataFormerElement };
  }
}
