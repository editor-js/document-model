import type { TextRange, InlineFragment, FormattingAction, IntersectType } from '@editorjs/model';
import type { InlineTool as InlineToolVersion2 } from '@editorjs/editorjs';
import type { InlineToolConstructorOptions as InlineToolConstructorOptionsVersion2 } from '@editorjs/editorjs';

/**
 * Extended InlineToolConstructorOptions interface for version 3.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface InlineToolConstructorOptions extends InlineToolConstructorOptionsVersion2 {}

/**
 * Object represents formatting action with text range to be applied on
 */
export interface FormattingActionWithRange {
  /**
   * Formatting action - format or unformat
   */
  action: FormattingAction;

  /**
   * Range to apply formatting action
   */
  range: TextRange;
}

/**
 * Inline Tool interface for version 3
 *
 * In version 3, the save method is removed since all data is stored in the model
 */
export interface InlineTool extends Omit<InlineToolVersion2, 'save' | 'checkState' | 'render'> {
  /**
   * Type of merging of two ranges which intersect
   */
  intersectType?: IntersectType;

  /**
   * Function that returns the state of the tool for the current selection
   * @param index - index of current text selection
   * @param fragments - all fragments of the inline tool inside of the current input
   */
  isActive(index: TextRange, fragments: InlineFragment[]): boolean;

  /**
   * Returns formatting action and range for it to be applied
   * @param index - index of current selection
   * @param fragments - all fragments of the inline tool inside of the current input
   */
  getAction(index: TextRange, fragments: InlineFragment[]): FormattingActionWithRange;

  /**
   * Method for creating wrapper element of the tool
   */
  createWrapper(): HTMLElement;
}

/**
 * Interface, that represents inline tool with configured name
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface InlineToolsConfig extends Record<string, InlineToolConstructor> {};

/**
 * @todo support options: InlineToolConstructableOptions
 * Inline Tool constructor class
 */
export type InlineToolConstructor = new () => InlineTool;