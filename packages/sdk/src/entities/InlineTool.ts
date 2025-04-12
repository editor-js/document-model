import type { TextRange, InlineFragment, FormattingAction, IntersectType } from '@editorjs/model';
import type { InlineTool as InlineToolVersion2 } from '@editorjs/editorjs';
import type { InlineToolConstructable as InlineToolConstructableV2 } from '@editorjs/editorjs';
import type { InlineToolConstructorOptions as InlineToolConstructorOptionsVersion2 } from '@editorjs/editorjs';

/**
 * Extended InlineToolConstructorOptions interface for version 3.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface InlineToolConstructorOptions extends InlineToolConstructorOptionsVersion2 {}

/**
 * Object represents formatting action with text range to be applied on
 */
export interface ToolFormattingOptions {
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
 * @todo support fakeSelectionRequired option
 * Interface that represents options handled by toolbar element
 */
export interface ToolbarOptions {
  /**
   * Some tools require fake selection to be applied when 'actions' is open
   * Example: Link tool
   */
  fakeSelectionRequired: boolean;
}

/**
 * Interface that represents return type of the renderActions function of the tool
 * Contains rendered by tool renderActions with options for toolbar
 */
export interface ActionsElementWithOptions {
  /**
   * HTML element rendered by tool for data forming
   */
  element: HTMLElement;

  /**
   * Options of custom toolbar behaviour
   */
  toolbarOptions?: ToolbarOptions;
}

export type InlineToolFormatData = Record<string, unknown>;

/**
 * Inline Tool interface for version 3
 *
 * In version 3, the save method is removed since all data is stored in the model
 */
export interface InlineTool extends Omit<InlineToolVersion2, 'save' | 'checkState' | 'render' | 'renderActions'> {
  /**
   * Type of merging of two ranges which intersect
   */
  intersectType?: IntersectType;

  /**
   * Function that returns the state of the tool for the current selection
   * @param index - index of current text selection
   * @param fragments - all fragments of the inline tool inside the current input
   */
  isActive(index: TextRange, fragments: InlineFragment[]): boolean;

  /**
   * Returns formatting action and range for it to be applied
   * @param range - current selection range
   * @param fragments - all fragments of the inline tool inside the current input
   */
  getFormattingOptions(range: TextRange, fragments: InlineFragment[]): ToolFormattingOptions;

  /**
   * Method for creating wrapper element of the tool
   */
  createWrapper(data?: InlineToolFormatData): HTMLElement;

  /**
   * Create element for toolbar, which will form data required for inline tool
   * @param callback - callback function that should be triggered, when data is formed, to apply format to model
   */
  renderActions?(callback: (data: InlineToolFormatData) => void): ActionsElementWithOptions;
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
export type InlineToolConstructor = InlineToolConstructableV2 & (new () => InlineTool) & {
  /**
   * Property specifies the class is a Tool
   */
  type: 'tool';
};
