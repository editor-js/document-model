import type { ToolConfig } from '@editorjs/editorjs';
import type { BlockToolOptions } from './BlockTool.js';
import type { InlineToolOptions } from './InlineTool.js';
import type { BlockTuneOptions } from './BlockTune.js';
import type { ToolType } from './EntityType.js';
import type { ToolPluginOptions } from '../index.js';

/**
 * Canonical keys shared by every tool options interface.
 */
export enum BaseToolOptionKey {
  /**
   * Plugin-specific configuration object passed to the tool instance.
   */
  Config = 'config',

  /**
   * Configuration the tool addresses to editor plugins, keyed by plugin `name`.
   */
  Plugins = 'plugins'
}

/**
 * Options common to every tool type.
 * @template Config - Shape of the plugin-specific {@link BaseToolOptionKey.Config} object.
 */
export interface BaseToolOptions<Config extends ToolConfig = ToolConfig> {
  /**
   * Plugin-specific configuration passed to the tool instance.
   * Defaults set here are merged with (and overridden by) the `config` key
   * in the second argument of `core.use(Tool, options)`.
   */
  [BaseToolOptionKey.Config]?: Config;

  /**
   * Configuration this tool addresses to editor plugins, keyed by plugin `name`.
   * Each plugin reads only its own slice via `BaseToolFacade.pluginOptions(name)`.
   * @example
   * static options = { plugins: { shortcuts: { shortcut: 'CMD+B' } } };
   */
  [BaseToolOptionKey.Plugins]?: ToolPluginOptions;
}

// Re-export so consumers can import all option types from this file
export type { BlockToolOptions, InlineToolOptions, BlockTuneOptions };

/**
 * Union of all per-tool option shapes.
 * Used as the type of the second argument of `core.use(Tool, options)`.
 */
export type ToolStaticOptions = BlockToolOptions | InlineToolOptions | BlockTuneOptions;

/**
 * Maps a {@link ToolType} value to its corresponding tool options interface.
 * @example
 * function getTitle<T extends ToolType>(type: T, options: ToolTypeToOptions[T]) { ... }
 */
export type ToolTypeToOptions = {
  /**
   * BlockTool Options
   */
  [ToolType.Block]: BlockToolOptions;
  /**
   * InlineTool Options
   */
  [ToolType.Inline]: InlineToolOptions;
  /**
   * BlockTune Options
   */
  [ToolType.Tune]: BlockTuneOptions;
};

/**
 * Common interface for Tool constructor (static) side.
 * @template Config  - Shape of the plugin-specific config object. Passed to
 *                     {@link prepare} and used to type {@link options.config}.
 * @template Options - The concrete options interface for this tool type
 *                     (defaults to the generic {@link BaseToolOptions}).
 */
export interface BaseToolConstructor<
  Config extends ToolConfig = ToolConfig,
  Options extends BaseToolOptions<Config> = BaseToolOptions<Config>
> {
  /**
   * Tool name used to identify the tool across the editor.
   * Falls back to the JavaScript class name if not explicitly set.
   */
  name: string;

  /**
   * All static configuration for the tool.
   * Values here are defaults; they can be overridden via the second argument
   * of `core.use(Tool, options)`.
   */
  options?: Options;

  /**
   * Tool's prepare method. Can be async.
   * @param data - Object with toolName and config properties
   * @param data.toolName - Tool's own name
   * @param data.config   - Merged plugin configuration
   */
  // eslint-disable-next-line -- ESLint doesn't understand it's a type
  prepare?(data: { toolName: string, config: Config }): void | Promise<void>;

  /**
   * Tool's reset method to clean up anything set by prepare. Can be async.
   */
  reset?(): void | Promise<void>;
}
