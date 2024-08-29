import type { BlockToolAdapter } from '@editorjs/dom-adapters';
import { BaseToolFacade, InternalBlockToolSettings, UserSettings } from './BaseToolFacade.js';
import type {
  BlockAPI,
  BlockToolData,
  ConversionConfig,
  PasteConfig, SanitizerConfig, ToolboxConfig,
  ToolboxConfigEntry
} from '@editorjs/editorjs';
import { isEmpty, cacheable, isObject } from '@editorjs/helpers';
import { type InlineToolFacade } from './InlineToolFacade.js';
import { ToolType } from './ToolType.js';
import { type BlockTuneFacade } from './BlockTuneFacade.js';
import { ToolsCollection } from './ToolsCollection.js';
import { BlockToolConstructor as BlockToolConstructable, BlockTool as IBlockTool } from '@editorjs/sdk';

/**
 * Class to work with Block tools constructables
 */
export class BlockToolFacade extends BaseToolFacade<ToolType.Block, IBlockTool> {
  /**
   * Tool type for BlockToolFacade tools — Block
   */
  public type: ToolType.Block = ToolType.Block;

  /**
   * InlineTool collection for current Block Tool
   */
  public inlineTools: ToolsCollection<InlineToolFacade> = new ToolsCollection<InlineToolFacade>();

  /**
   * BlockTune collection for current Block Tool
   */
  public tunes: ToolsCollection<BlockTuneFacade> = new ToolsCollection<BlockTuneFacade>();

  /**
   * Tool's constructable blueprint
   */
  protected declare constructable: BlockToolConstructable;

  /**
   * Creates new Tool instance
   * @param options - Tool constructor options
   * @param options.data - Tools data
   * @param options.block - BlockAPI for current Block
   * @param options.readOnly - True if Editor is in read-only mode
   */
  // eslint-disable-next-line jsdoc/require-jsdoc
  public create({ data, block, readOnly, adapter }: { data: BlockToolData; block: BlockAPI; readOnly: boolean; adapter: BlockToolAdapter }): IBlockTool {
    return new this.constructable({
      adapter,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data,
      block,
      readOnly,
      api: this.api,
      config: this.settings,
    });
  }

  /**
   * Returns true if read-only mode is supported by Tool
   */
  public get isReadOnlySupported(): boolean {
    return this.constructable[InternalBlockToolSettings.IsReadOnlySupported] === true;
  }

  /**
   * Returns true if Tool supports linebreaks
   * @todo check if we still need this as BlockToolConstructable doesn't have line breaks option
   */
  // public get isLineBreaksEnabled(): boolean {
  //   return this.constructable[InternalBlockToolSettings.IsEnabledLineBreaks];
  // }

  /**
   * Returns Tool toolbox configuration (internal or user-specified).
   *
   * Merges internal and user-defined toolbox configs based on the following rules:
   *
   * - If both internal and user-defined toolbox configs are arrays their items are merged.
   * Length of the second one is kept.
   *
   * - If both are objects their properties are merged.
   *
   * - If one is an object and another is an array than internal config is replaced with user-defined
   * config. This is made to allow user to override default tool's toolbox representation (single/multiple entries)
   */
  public get toolbox(): ToolboxConfigEntry[] | undefined {
    const toolToolboxSettings = this.constructable[InternalBlockToolSettings.Toolbox] as ToolboxConfig;
    const userToolboxSettings = this.config[UserSettings.Toolbox];

    if (isEmpty(toolToolboxSettings)) {
      return;
    }
    if (userToolboxSettings === false) {
      return;
    }
    /**
     * Return tool's toolbox settings if user settings are not defined
     */
    if (!userToolboxSettings) {
      return Array.isArray(toolToolboxSettings) ? toolToolboxSettings : [toolToolboxSettings];
    }

    /**
     * Otherwise merge user settings with tool's settings
     */
    if (Array.isArray(toolToolboxSettings)) {
      if (Array.isArray(userToolboxSettings)) {
        return userToolboxSettings.map((item, i) => {
          const toolToolboxEntry = toolToolboxSettings[i];

          if (toolToolboxEntry !== undefined) {
            return {
              ...toolToolboxEntry,
              ...item,
            };
          }

          return item;
        });
      }

      return [userToolboxSettings];
    } else {
      if (Array.isArray(userToolboxSettings)) {
        return userToolboxSettings;
      }

      return [
        {
          ...toolToolboxSettings,
          ...userToolboxSettings,
        },
      ];
    }
  }

  /**
   * Returns Tool conversion configuration
   */
  public get conversionConfig(): ConversionConfig | undefined {
    return this.constructable[InternalBlockToolSettings.ConversionConfig];
  }

  /**
   * Returns enabled inline tools for Tool
   */
  public get enabledInlineTools(): boolean | string[] {
    return this.config[UserSettings.EnabledInlineTools] ?? false;
  }

  /**
   * Returns enabled tunes for Tool
   */
  public get enabledBlockTunes(): boolean | string[] {
    return this.config[UserSettings.EnabledBlockTunes] ?? false;
  }

  /**
   * Returns Tool paste configuration
   */
  public get pasteConfig(): PasteConfig {
    return this.constructable[InternalBlockToolSettings.PasteConfig] ?? {};
  }

  /**
   * Returns sanitize configuration for Block Tool including configs from related Inline Tools and Block Tunes
   */
  @cacheable
  public get sanitizeConfig(): SanitizerConfig {
    const toolRules = super.sanitizeConfig;
    const baseConfig = this.baseSanitizeConfig;

    if (isEmpty(toolRules)) {
      return baseConfig;
    }

    const toolConfig = {} as SanitizerConfig;

    for (const fieldName in toolRules) {
      if (Object.prototype.hasOwnProperty.call(toolRules, fieldName)) {
        const rule = toolRules[fieldName];

        /**
         * If rule is object, merge it with Inline Tools configuration
         *
         * Otherwise pass as it is
         */
        if (isObject(rule)) {
          toolConfig[fieldName] = Object.assign({}, baseConfig, rule);
        } else {
          toolConfig[fieldName] = rule;
        }
      }
    }

    return toolConfig;
  }

  /**
   * Returns sanitizer configuration composed from sanitize config of Inline Tools enabled for Tool
   */
  @cacheable
  public get baseSanitizeConfig(): SanitizerConfig {
    const baseConfig = {};

    Array
      .from(this.inlineTools.values())
      .forEach(tool => Object.assign(baseConfig, tool.sanitizeConfig));

    Array
      .from(this.tunes.values())
      .forEach(tune => Object.assign(baseConfig, tune.sanitizeConfig));

    return baseConfig;
  }
}
