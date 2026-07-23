import type { TextRange, InlineFragment } from '@editorjs/model-types';
import type { FormattingAction, IntersectType } from '@editorjs/model-types';
import type { InlineTool as InlineToolVersion2 } from 'editorjs-v2';
import type { InlineToolConstructorOptions as InlineToolConstructorOptionsVersion2, ToolConfig } from 'editorjs-v2';
import type { ToolType } from './EntityType.js';
import type { BaseToolConstructor, BaseToolOptions } from './BaseTool';
import type { EditorAPI } from '../api';
import type { MenuConfig } from './MenuConfig.js';

/**
 * Canonical keys for Inline Tool options.
 * Use these instead of raw string literals when reading or writing inline-tool options.
 */
export enum InlineToolOptionKey {
  /** Human-readable title shown in the inline toolbar. */
  Title = 'title',
  /** Keyboard shortcut string (e.g. `CMD+B`). */
  Shortcut = 'shortcut'
}

/**
 * Options available on **Inline Tools** (`static options` or `use()` overrides).
 * @template Config - Shape of the plugin-specific {@link BaseToolOptions.config} object.
 */
export interface InlineToolOptions<Config extends ToolConfig = ToolConfig>
  extends BaseToolOptions<Config> {
  /**
   * Human-readable title shown in the inline toolbar.
   */
  [InlineToolOptionKey.Title]?: string;

  /**
   * Keyboard shortcut string (e.g. `CMD+B`).
   */
  [InlineToolOptionKey.Shortcut]?: string;

  /** Any additional custom options exposed by the tool developer. */
  [key: string]: unknown;
}

/**
 * Extended InlineToolConstructorOptions interface for version 3.
 */
export interface InlineToolConstructorOptions extends Omit<InlineToolConstructorOptionsVersion2, 'api'> {
  /**
   * EditorJS API instance
   */
  api: EditorAPI;
}

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
   * Inline toolbar items configuration for the Tool
   */
  getToolbarConfig(index: TextRange, fragments: InlineFragment[]): MenuConfig | Promise<MenuConfig>;
}

/**
 * Interface, that represents inline tool with configured name
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface InlineToolsConfig extends Record<string, InlineToolConstructor> {};

/**
 * Inline Tool constructor class
 */
export interface InlineToolConstructor extends BaseToolConstructor<ToolConfig, InlineToolOptions> {
  new(params: InlineToolConstructorOptions): InlineTool;

  /**
   * Property specifies the entity is an Inline Tool
   */
  type: ToolType.Inline;
}
