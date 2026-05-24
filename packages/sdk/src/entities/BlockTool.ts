import type {
  BlockTool as BlockToolVersion2,
  ToolConfig,
  ToolboxConfigEntry
} from '@editorjs/editorjs';
import type { BlockToolConstructorOptions as BlockToolConstructorOptionsVersion2 } from '@editorjs/editorjs';
import type { ValueSerialized } from '@editorjs/model';
import type { BlockToolAdapter } from './BlockToolAdapter.js';
import type { ToolType } from '@/entities/EntityType.js';
import type { BaseToolConstructor, BaseToolOptions } from '@/entities/BaseTool';

/**
 * Canonical keys for Block Tool options.
 * Use these instead of raw string literals when reading or writing block-tool options.
 */
export enum BlockToolOptionKey {
  /** Toolbox entry / entries for this tool. */
  Toolbox = 'toolbox',
  /** Whether read-only mode is supported. */
  IsReadOnlySupported = 'isReadOnlySupported',
  /** Keyboard shortcut string (e.g. `CMD+SHIFT+H`). */
  Shortcut = 'shortcut',
  /** Inline tools enabled for blocks of this type. */
  InlineToolbar = 'inlineToolbar',
  /** Block tunes enabled for blocks of this type. */
  Tunes = 'tunes'
}

/**
 * Options available on **Block Tools** (`static options` or `use()` overrides).
 * @template Config - Shape of the plugin-specific {@link BaseToolOptions.config} object.
 */
export interface BlockToolOptions<Config extends ToolConfig = ToolConfig>
  extends BaseToolOptions<Config> {
  /**
   * Toolbox entry (or entries) that represent this tool in the toolbox.
   * Set to `false` to hide the tool from the toolbox entirely.
   */
  [BlockToolOptionKey.Toolbox]?: ToolboxConfigEntry | ToolboxConfigEntry[] | false;

  /**
   * Whether read-only mode is supported by this tool.
   */
  [BlockToolOptionKey.IsReadOnlySupported]?: boolean;

  /**
   * Keyboard shortcut string (e.g. `CMD+SHIFT+H`).
   */
  [BlockToolOptionKey.Shortcut]?: string;

  /**
   * Inline tools to enable for this block tool.
   * Pass `true` to enable all registered inline tools, or an array of names.
   */
  [BlockToolOptionKey.InlineToolbar]?: boolean | string[];

  /**
   * Block tunes to enable for this block tool.
   * Pass `true` to enable all registered tunes, or an array of names.
   */
  [BlockToolOptionKey.Tunes]?: boolean | string[];

  /** Any additional custom options exposed by the tool developer. */
  [key: string]: unknown;
}

/**
 * Extended BlockToolConstructorOptions interface for version 3.
 */
export interface BlockToolConstructorOptions<
  /**
   * Data structure describing the tool's input/output data
   */
  Data extends BlockToolData = BlockToolData,
  /**
   * User-end configuration for the tool
   */
  Config extends ToolConfig = ToolConfig,
  /**
   * Adapter type — defaults to the base BlockToolAdapter.
   * Override with a more specific adapter type (e.g. DOMBlockToolAdapter)
   * if your tool needs access to DOM-specific methods such as setInput.
   */
  Adapter extends BlockToolAdapter = BlockToolAdapter
> extends BlockToolConstructorOptionsVersion2 {
  /**
   * Block tool adapter will be passed to the tool to connect data with the DOM
   */
  adapter: Adapter;

  /**
   * Tool's input/output data
   */
  data: Data;

  /**
   * Config could be passed by tools user through the Editor config
   */
  config: Config;
}

/**
 * Block Tool interface for version 3
 *
 * In version 3, the save method is removed since all data is stored in the model
 */
export type BlockTool<
  /**
   * Data structure describing the tool's input/output data
   *
   * any is used as a placeholder to allow using BlockToolData without generic
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  Data extends BlockToolData = any,
  /**
   * User-end configuration for the tool
   *
   * any is used as a placeholder to allow using BlockToolData without generic
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  Config extends ToolConfig = any
> = Omit<BlockToolVersion2, 'save'>;

/**
 * Block Tool constructor class
 */
export interface BlockToolConstructor<
  Data extends BlockToolData = BlockToolData,
  /**
   * Plugin-specific configuration type — also types `options.config`
   */
  Config extends ToolConfig = ToolConfig,
  Adapter extends BlockToolAdapter = BlockToolAdapter
> extends BaseToolConstructor<Config, BlockToolOptions<Config>> {
  new(options: BlockToolConstructorOptions<Data, Config, Adapter>): BlockTool;

  /**
   * Property specifies that the class is a Block Tool
   */
  type: ToolType.Block;
}

/**
 * Data structure describing the tool's input/output data
 *
 * any is used as a placeholder to allow using BlockToolData without generic
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BlockToolData<T extends Record<string, ValueSerialized> = any> = T;
