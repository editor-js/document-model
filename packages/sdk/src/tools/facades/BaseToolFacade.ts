import type {
  Tool
} from '@editorjs/editorjs';
import { isFunction } from '@editorjs/helpers';
import { type BlockToolFacade } from './BlockToolFacade.js';
import { type InlineToolFacade } from './InlineToolFacade.js';
import { ToolType, BaseToolOptionKey } from '../../entities/index.js';
import { type BlockTuneFacade } from './BlockTuneFacade.js';
import type {
  BlockTool, BlockToolConstructor, InlineTool, InlineToolConstructor, BlockTuneConstructor,
  ToolTypeToOptions, ToolStaticOptions, BlockToolOptions, InlineToolOptions, BlockTuneOptions
} from '../../entities/index.js';
import type { EditorAPI } from '../../api';
import type { ToolPluginOptions, ToolPluginOptionsMap } from '../../index.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- need to allow any type here so extended interfaces pass
export type ToolConstructable = BlockToolConstructor<any, any, any> | InlineToolConstructor | BlockTuneConstructor;

// Re-export canonical option-key enums so facades/consumers can import from one place
export { BaseToolOptionKey } from '../../entities/BaseTool.js';
export { BlockToolOptionKey } from '../../entities/BlockTool.js';
export { InlineToolOptionKey } from '../../entities/InlineTool.js';

/**
 * Keys for the options the **user** supplies as the second argument of `core.use(Tool, options)`.
 * Mirrors the keys of {@link BlockToolOptions} with user-facing names.
 */
export enum UserToolOptions {
  /** Toolbox entry override for the tool. */
  Toolbox = 'toolbox',
  /** Inline tools enabled for blocks of this type. */
  EnabledInlineTools = 'inlineToolbar',
  /** Block tunes enabled for blocks of this type. */
  EnabledBlockTunes = 'tunes',
  /** Plugin-specific configuration. */
  Config = 'config'
}

export type ToolOptions = ToolStaticOptions;

// Re-export per-tool option types so consumers can import them from here
export type { BlockToolOptions, InlineToolOptions, BlockTuneOptions };

/**
 * BlockToolFacade constructor options inteface
 */
interface ConstructorOptions {
  /**
   * Tool name
   */
  name: string;

  /**
   * Tool constructor function/class
   */
  constructable: ToolConstructable;

  /**
   * Second argument of `use(Tool, options)` (Editor.js-style tool settings, excluding `class`)
   */
  useToolOptions: ToolOptions;

  /**
   * Api methods for the Tool
   */
  api: EditorAPI;

  /**
   * Is tool default
   */
  isDefault: boolean;

  /**
   * Defualt placaholder for the Tol
   */
  defaultPlaceholder?: string | false;
}

/**
 * Base abstract class for Tools
 */
export abstract class BaseToolFacade<Type extends ToolType = ToolType, ToolClass extends (Tool | InlineTool | BlockTool) = (Tool | InlineTool | BlockTool)> {
  /**
   * Tool name specified in EditorJS config
   */
  public name: string;

  /**
   * Flag show is current Tool default or not
   */
  public readonly isDefault: boolean;

  /**
   * EditorJS API for current Tool
   */
  protected api: EditorAPI;

  /**
   * Second argument of `use(Tool, options)` (feature flags, `shortcut`, nested `config` for the tool plugin, etc.)
   */
  protected useToolOptions: ToolTypeToOptions[Type];

  /**
   * Tool's constructable blueprint
   */
  protected readonly constructable: ToolConstructable;

  /**
   * Default placeholder specified in EditorJS user configuration
   */
  protected defaultPlaceholder?: string | false;

  /**
   * Tool type: Block, Inline or Tune
   */
  public abstract type: Type;

  /**
   * BaseToolFacade constructor function
   * @param options - BaseToolFacade constructor paramaters
   */
  constructor({
    name,
    constructable,
    useToolOptions,
    api,
    isDefault,
    defaultPlaceholder,
  }: ConstructorOptions) {
    this.api = api;
    this.name = name;
    this.constructable = constructable;
    this.useToolOptions = useToolOptions;
    this.isDefault = isDefault;
    this.defaultPlaceholder = defaultPlaceholder;
  }

  /**
   * Static {@link ToolConstructable.options} merged with `use(Tool, options)` (later keys win).
   * Shortcut handling is delegated to the Shortcuts plugin; `shortcut` / `shortcuts` may appear here.
   * @returns Merged static tool options and second-argument `use` options
   */
  public get options(): ToolTypeToOptions[Type] {
    const staticDefaults = this.constructable.options ?? {};

    return {
      ...staticDefaults,
      ...this.useToolOptions,
      ...(this.#mergedPluginOptions === undefined
        ? {}
        : { [BaseToolOptionKey.Plugins]: this.#mergedPluginOptions }),
    };
  }

  /**
   * Configuration this tool addresses to a single plugin.
   *
   * Merging is shallow at the plugin-id level: a slice supplied through `use(Tool, options)`
   * replaces the tool's static slice for that id wholesale, while ids present in only one of
   * the two sources are preserved.
   * @param name - plugin `name` whose slice should be returned
   * @returns The merged slice, or `undefined` when the tool addresses nothing to that plugin
   */
  public pluginOptions<Id extends keyof ToolPluginOptionsMap>(name: Id): ToolPluginOptionsMap[Id] | undefined {
    return this.#mergedPluginOptions?.[name];
  }

  /**
   * All plugin-directed slices merged per plugin id, or `undefined` when neither source has any.
   */
  get #mergedPluginOptions(): ToolPluginOptions | undefined {
    const fromTool = this.constructable.options?.[BaseToolOptionKey.Plugins];
    const fromUse = this.useToolOptions[BaseToolOptionKey.Plugins];

    if (fromTool === undefined && fromUse === undefined) {
      return undefined;
    }

    return {
      ...fromTool,
      ...fromUse,
    };
  }

  /**
   * Plugin-specific `config` only: static `options().config` merged with `options.config` from `use(Tool, options)`.
   * @returns Merged tool plugin configuration object
   */
  public get config(): Record<string, unknown> {
    const staticOpts = this.constructable.options;
    const fromTool = (staticOpts?.[BaseToolOptionKey.Config] ?? {}) as Record<string, unknown>;
    const fromUse = (this.useToolOptions[UserToolOptions.Config] ?? {}) as Record<string, unknown>;
    const merged: Record<string, unknown> = {
      ...fromTool,
      ...fromUse,
    };

    if (this.isDefault && !('placeholder' in merged) && typeof this.defaultPlaceholder === 'string') {
      merged.placeholder = this.defaultPlaceholder;
    }

    return merged;
  }

  /**
   * Calls Tool's reset method
   */
  public reset(): void | Promise<void> {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    if (isFunction(this.constructable.reset)) {
      return this.constructable.reset();
    }
  }

  /**
   * Calls Tool's prepare method
   */
  public prepare(): void | Promise<void> {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    if (isFunction(this.constructable.prepare)) {
      return this.constructable.prepare({
        toolName: this.name,
        config: this.config,
      });
    }
  }

  // /**
  //  * Returns Tool's sanitizer configuration
  //  */
  // public get sanitizeConfig(): SanitizerConfig {
  //   return this.constructable[CommonInternalSettings.SanitizeConfig] || {};
  // }

  /**
   * Returns true if Tools is inline
   */
  public isInline(): this is InlineToolFacade {
    return this.type === ToolType.Inline;
  }

  /**
   * Returns true if Tools is block
   */
  public isBlock(): this is BlockToolFacade {
    return this.type === ToolType.Block;
  }

  /**
   * Returns true if Tools is tune
   */
  public isTune(): this is BlockTuneFacade {
    return this.type === ToolType.Tune;
  }

  /**
   * Constructs new Tool instance from constructable blueprint
   * @param args
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public abstract create(...args: any[]): ToolClass;
}
