import { BaseToolFacade, UserToolOptions } from './BaseToolFacade.js';
import type { BlockToolOptions } from './BaseToolFacade.js';
import { BlockToolOptionKey } from '../../entities/BlockTool.js';
import type {
  // ConversionConfig,
  // PasteConfig,
  // SanitizerConfig,
  ToolboxConfig,
  ToolboxConfigEntry
} from '@editorjs/editorjs';
import {
  isEmpty
  // cacheable,
  // isObject
} from '@editorjs/helpers';
import { type InlineToolFacade } from './InlineToolFacade.js';
import { type BlockTuneFacade } from './BlockTuneFacade.js';
import { ToolsCollection } from '../ToolsCollection.js';
import type { BlockToolConstructor, BlockToolConstructorOptions, BlockTool, BlockToolData } from '../../entities';
import { ToolType } from '../../entities';
import { BlockChildType, NODE_TYPE_HIDDEN_PROP } from '@editorjs/model-types';
import * as keypath from '../../utils/keypath.js';
import type { InlineFragment } from '@editorjs/model-types';

/**
 * Class to work with Block tools constructables
 */
export class BlockToolFacade extends BaseToolFacade<ToolType.Block, BlockTool> {
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
   * Tool's constructable blueprint — narrowed to BlockToolConstructor
   */
  protected declare constructable: BlockToolConstructor;

  /**
   * Narrowed to BlockToolOptions so block-specific properties are fully typed
   */
  protected declare useToolOptions: BlockToolOptions;

  /**
   * Creates new Tool instance
   * @param options - Tool constructor options
   * @param options.data - Tools data
   * @param options.block - BlockAPI for current Block
   * @param options.readOnly - True if Editor is in read-only mode
   */
  public create({ data, block, readOnly, adapter }: Pick<BlockToolConstructorOptions, 'data' | 'block' | 'readOnly' | 'adapter'>): BlockTool {
    return new this.constructable({
      adapter,
      data,
      block,
      readOnly,
      api: this.api,
      config: this.config,
    });
  }

  /**
   * Returns true if read-only mode is supported by Tool
   */
  public get isReadOnlySupported(): boolean {
    return this.constructable.options?.[BlockToolOptionKey.IsReadOnlySupported] === true;
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
    const toolToolboxSettings = this.constructable.options?.[BlockToolOptionKey.Toolbox] as ToolboxConfig;
    const userToolboxSettings = this.useToolOptions[UserToolOptions.Toolbox];

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
  //
  // /**
  //  * Returns Tool conversion configuration
  //  */
  // public get conversionConfig(): ConversionConfig | undefined {
  //   return this.constructable[InternalBlockToolSettings.ConversionConfig];
  // }

  /**
   * Returns block data from plain text using the tool's conversion config import function.
   * If the import config is a function, it is called with the text value.
   * Otherwise, a default text node structure is returned.
   * @param value - plain text to convert
   * @param fragments - inline fragments associated with the text
   */
  public importTextContent(value: string, fragments: InlineFragment[]): BlockToolData {
    const conversionConfig = this.options[BlockToolOptionKey.ConversionConfig];
    const importFnOrProp = conversionConfig?.import;

    if (importFnOrProp === undefined) {
      throw new Error(`Tool ${this.name} does not have import configuration for text content`);
    }

    /**
     * @todo pass fragments to the import function?
     */
    if (typeof importFnOrProp === 'function') {
      return importFnOrProp(value);
    }

    const result: BlockToolData = {};

    keypath.set(result, importFnOrProp, {
      value,
      fragments,
      [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text as BlockChildType.Text,
    });

    return result;
  }

  /**
   * Returns enabled inline tools for Tool
   */
  public get enabledInlineTools(): boolean | string[] {
    return this.useToolOptions[UserToolOptions.EnabledInlineTools] ?? false;
  }

  /**
   * Returns enabled tunes for Tool
   */
  public get enabledBlockTunes(): boolean | string[] {
    return this.useToolOptions[UserToolOptions.EnabledBlockTunes] ?? false;
  }

  // /**
  //  * Returns Tool paste configuration
  //  */
  // public get pasteConfig(): PasteConfig {
  //   return this.constructable[InternalBlockToolSettings.PasteConfig] ?? {};
  // }

  /**
   * Returns sanitize configuration for Block Tool including configs from related Inline Tools and Block Tunes
   */
  // @cacheable
  // public get sanitizeConfig(): SanitizerConfig {
  //   const toolRules = super.sanitizeConfig;
  //   const baseConfig = this.baseSanitizeConfig;
  //
  //   if (isEmpty(toolRules)) {
  //     return baseConfig;
  //   }
  //
  //   const toolConfig = {} as SanitizerConfig;
  //
  //   for (const fieldName in toolRules) {
  //     if (Object.prototype.hasOwnProperty.call(toolRules, fieldName)) {
  //       const rule = toolRules[fieldName];
  //
  //       /**
  //        * If rule is object, merge it with Inline Tools configuration
  //        *
  //        * Otherwise pass as it is
  //        */
  //       if (isObject(rule)) {
  //         toolConfig[fieldName] = Object.assign({}, baseConfig, rule);
  //       } else {
  //         toolConfig[fieldName] = rule;
  //       }
  //     }
  //   }
  //
  //   return toolConfig;
  // }

  /**
   * Returns sanitizer configuration composed from sanitize config of Inline Tools enabled for Tool
   */
  // @cacheable
  // public get baseSanitizeConfig(): SanitizerConfig {
  //   const baseConfig = {};
  //
  //   Array
  //     .from(this.inlineTools.values())
  //     .forEach(tool => Object.assign(baseConfig, tool.sanitizeConfig));
  //
  //   Array
  //     .from(this.tunes.values())
  //     .forEach(tune => Object.assign(baseConfig, tune.sanitizeConfig));
  //
  //   return baseConfig;
  // }
}
