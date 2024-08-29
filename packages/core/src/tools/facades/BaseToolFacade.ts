import type {
  SanitizerConfig,
  API as ApiMethods,
  Tool,
  ToolConstructable as ToolConstructableV2,
  ToolSettings
} from '@editorjs/editorjs';
import { isFunction } from '@editorjs/helpers';
import { type BlockToolFacade } from './BlockToolFacade.js';
import { type InlineToolFacade } from './InlineToolFacade.js';
import { ToolType } from './ToolType.js';
import { type BlockTuneFacade } from './BlockTuneFacade.js';
import type { BlockTool, BlockToolConstructor, InlineTool, InlineToolConstructor } from '@editorjs/sdk';

export type ToolConstructable = ToolConstructableV2 | BlockToolConstructor | InlineToolConstructor;

/**
 * Enum of Tool options provided by user
 */
export enum UserSettings {
  /**
   * Shortcut for Tool
   */
  Shortcut = 'shortcut',
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
   * Shortcut for Tool
   */
  Shortcut = 'shortcut',
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
   * Flag specifies Tool is inline
   */
  IsInline = 'isInline',
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
   * Tool options
   */
  config: ToolOptions;

  /**
   * Api methods for the Tool
   */
  api: ApiMethods;

  /**
   * Is tool default
   */
  isDefault: boolean;

  /**
   * Is tool internal
   */
  isInternal: boolean;

  /**
   * Defualt placaholder for the Tol
   */
  defaultPlaceholder?: string | false;
}

/**
 * Base abstract class for Tools
 */
// eslint-disable-next-line @stylistic/type-generic-spacing
export abstract class BaseToolFacade<Type extends ToolType = ToolType, ToolClass extends (Tool | InlineTool | BlockTool) = (Tool | InlineTool | BlockTool)> {
  /**
   * Tool name specified in EditorJS config
   */
  public name: string;

  /**
   * Flag show is current Tool internal (bundled with EditorJS core) or not
   */
  public readonly isInternal: boolean;

  /**
   * Flag show is current Tool default or not
   */
  public readonly isDefault: boolean;

  /**
   * EditorJS API for current Tool
   */
  protected api: ApiMethods;

  /**
   * Current tool user configuration
   */
  protected config: ToolOptions;

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
    config,
    api,
    isDefault,
    isInternal = false,
    defaultPlaceholder,
  }: ConstructorOptions) {
    this.api = api;
    this.name = name;
    this.constructable = constructable;
    this.config = config;
    this.isDefault = isDefault;
    this.isInternal = isInternal;
    this.defaultPlaceholder = defaultPlaceholder;
  }

  /**
   * Returns Tool user configuration
   */
  public get settings(): ToolOptions {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const config = this.config[UserSettings.Config] ?? {};

    if (this.isDefault && !('placeholder' in config) && typeof this.defaultPlaceholder === 'string') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      config.placeholder = this.defaultPlaceholder;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return config;
  }

  /**
   * Calls Tool's reset method
   */
  public reset(): void | Promise<void> {
    if (isFunction(this.constructable.reset)) {
      return this.constructable.reset();
    }
  }

  /**
   * Calls Tool's prepare method
   */
  public prepare(): void | Promise<void> {
    if (isFunction(this.constructable.prepare)) {
      return this.constructable.prepare({
        toolName: this.name,
        config: this.settings,
      });
    }
  }

  /**
   * Returns shortcut for Tool (internal or specified by user)
   */
  public get shortcut(): string | undefined {
    /**
     * @todo check if we support user shortcuts as static property as it is not specified in types
     */
    // const toolShortcut = this.constructable[CommonInternalSettings.Shortcut];
    const userShortcut = this.config[UserSettings.Shortcut];

    return userShortcut; // || toolShortcut;
  }

  /**
   * Returns Tool's sanitizer configuration
   */
  public get sanitizeConfig(): SanitizerConfig {
    return this.constructable[CommonInternalSettings.SanitizeConfig] || {};
  }

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
