import type { InlineTool as InlineToolVersion2 } from '@editorjs/editorjs';
import type { BlockToolConstructorOptions as BlockToolConstructorOptionsVersion2 } from '@editorjs/editorjs';
import type { TextRange, InlineFragment, FormattingAction, IntersectType, InlineToolName } from '@editorjs/model';

/**
 * Extended BlockToolConstructorOptions interface for version 3.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface InlineToolConstructorOptions extends BlockToolConstructorOptionsVersion2 {}

/**
 * Block Tool interface for version 3
 *
 * In version 3, the save method is removed since all data is stored in the model
 */
export interface InlineTool extends Omit<InlineToolVersion2, 'save' | 'checkState' | 'render'> {
  /**
   * Name of the inline tool
   */
  name: InlineToolName;

  /**
   * Type of merging of two ranges which intersect
   */
  intersectType: IntersectType;

  /**
   * Returns formatting action and range for it to be applied
   * @param index - index of current text selection
   * @param fragments - all fragments of the bold inline tool inside of the current input
   */
  checkState(index: TextRange, fragments: InlineFragment[]): boolean;

  /**
   * Returns state of the bold inline tool
   * @param index - index of current selection
   * @param fragments - all fragments of the bold inline tool inside of the current input
   */
  getAction(index: TextRange, fragments: InlineFragment[]): {
    /**
     * Formatting action - format or unformat
     */
    action: FormattingAction;

    /**
     * Range to apply formatting action
     */
    range: TextRange;
  };

  /**
   * Method for rendering the tool
   */
  create(): HTMLElement;
}

/**
 * Block Tool constructor class
 */
export type InlineToolConstructor = new (options: InlineToolConstructorOptions) => InlineTool;
