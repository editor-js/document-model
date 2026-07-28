import type { BlockToolOptions } from './BlockTool.js';
import type { InlineToolOptions } from './InlineTool.js';
import type { BlockTuneOptions } from './BlockTune.js';
import type { ToolType } from './EntityType.js';

/**
 * Plugin-specific, tool-author-facing configuration object.
 *
 * Kept formally distinct from a tool's static options: `options` is core/plugin-facing
 * wiring read before any block instance exists, while `ToolConfig` is user data resolved
 * per tool registration and handed to the tool instance.
 *
 * Replaces the legacy `ToolConfig` re-exported from `@editorjs/editorjs`, whose default
 * type argument was `any` — meaning any tool that omitted the generic silently opted out
 * of type checking on its own configuration.
 * @template T - Shape of the tool's own configuration object.
 */
export type ToolConfig<T extends object = object> = T;

/**
 * Canonical keys shared by every tool options interface.
 */
export enum BaseToolOptionKey {
  /**
   * Plugin-specific configuration object passed to the tool instance.
   */
  Config = 'config'
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
}

/**
 * Derives a tool's static options from its resolved configuration.
 *
 * Declared in place of a plain options object when some option value depends on
 * config — e.g. a `toolbox` whose entries follow a `levels` config field. The
 * factory is called once per tool registration, with the `config` supplied to
 * `core.use(Tool, { config })`, so it must apply its own defaults for keys the
 * integrator omitted.
 *
 * It must be synchronous: every consumer of static options reads it through a
 * synchronous facade getter. Asynchronous tool initialization belongs in
 * {@link BaseToolConstructor.prepare} instead.
 * @template Config - Shape of the plugin-specific config object.
 * @template Options - The concrete options interface for this tool type.
 */
export type ToolOptionsFactory<
  Config extends ToolConfig = ToolConfig,
  Options extends BaseToolOptions<Config> = BaseToolOptions<Config>
> = (config: Config) => Options;

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
   *
   * May also be a {@link ToolOptionsFactory} — a synchronous function of the tool's
   * config — when option values are derived from configuration. The facade resolves
   * it once, per registration, and never writes the result back onto the tool class.
   */
  options?: Options | ToolOptionsFactory<Config, Options>;

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
