import type {
  // SanitizerConfig,
  API as ApiMethods,
  Tool,
  ToolSettings
} from '@editorjs/editorjs';
import { isFunction } from '@editorjs/helpers';
import { type BlockToolFacade } from './BlockToolFacade.js';
import { type InlineToolFacade } from './InlineToolFacade.js';
import { ToolType } from '../../entities/EntityType.js';
import { type BlockTuneFacade } from './BlockTuneFacade.js';
import type { BlockTool, BlockToolConstructor, InlineTool, InlineToolConstructor, BlockTuneConstructor } from '../../entities';

export type ToolConstructable = BlockToolConstructor | InlineToolConstructor | BlockTuneConstructor;

/**
 * Enum of Tool options provided by user
 */
export enum UserToolOptions {
  /**
   * Toolbox config for Tool
   */
  Toolbox = 'toolbox',
  /**
   * Enabled Inline Tools for Block Tool
   */
  EnabledInlineTools = 'inlineToolbar',
  /**
   * Enabled Block Tunes for Block Tool
   */
  EnabledBlockTunes = 'tunes',
  /**
   * Tool configuration
   */
  Config = 'config'
}

/**
 * Enum of Tool options provided by Tool
 */
export enum CommonInternalSettings {
  /**
   * Sanitize configuration for Tool
   */
  SanitizeConfig = 'sanitize'
}

/**
 * Enum of Tool options provided by Block Tool
 */
export enum InternalBlockToolSettings {
  /**
   * Is line breaks enabled for Tool
   */
  IsEnabledLineBreaks = 'enableLineBreaks',
  /**
   * Tool Toolbox config
   */
  Toolbox = 'toolbox',
  /**
   * Tool conversion config
   */
  ConversionConfig = 'conversionConfig',
  /**
   * Is readonly mode supported for Tool
   */
  IsReadOnlySupported = 'isReadOnlySupported',
  /**
   * Tool paste config
   */
  PasteConfig = 'pasteConfig'
}

/**
 * Enum of Tool options provided by Inline Tool
 */
export enum InternalInlineToolSettings {
  /**
   * Inline Tool title for toolbar
   */
  Title = 'title' // for Inline Tools. Block Tools can pass title along with icon through the 'toolbox' static prop.
}

/**
 * Enum of Tool options provided by Block Tune
 */
export enum InternalTuneSettings {
  /**
   * Flag specifies Tool is Block Tune
   */
  IsTune = 'isTune'
}

export type ToolOptions = Omit<ToolSettings, 'class'>;

/**
 * Static `options` on the tool class (plugin-side defaults)
 * provided by the tool developer
 */
export type StaticToolOptions = Record<string, unknown>;

/**
 * Result of merging static {@link ToolConstructable.options} with the second argument of `use(Tool, options)`.
 */
export interface MergedToolOptions {
  [key: string]: unknown;
}

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
  api: ApiMethods;

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
  protected api: ApiMethods;

  /**
   * Second argument of `use(Tool, options)` (feature flags, `shortcut`, nested `config` for the tool plugin, etc.)
   */
  protected useToolOptions: ToolOptions;

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
   */
  public get options(): MergedToolOptions {
    const staticDefaults = (this.constructable as { options?: StaticToolOptions }).options ?? {};

    return {
      ...staticDefaults,
      ...this.useToolOptions,
    };
  }

  /**
   * Plugin-specific `config` only: static `options().config` merged with `options.config` from `use(Tool, options)`.
   */
  public get config(): Record<string, unknown> {
    const staticOpts = (this.constructable as { options?: { config?: Record<string, unknown> } }).options;
    const fromTool = staticOpts?.config ?? {};
    const fromUse = (this.useToolOptions[UserToolOptions.Config] ?? {}) as Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
