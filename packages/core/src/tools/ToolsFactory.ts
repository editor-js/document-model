/* eslint-disable jsdoc/informative-docs */
import type { EditorAPI } from '@editorjs/sdk';
import { ToolType } from '@editorjs/sdk';
import type { ToolConstructable } from '@editorjs/sdk';
import {
  InlineToolFacade,
  BlockTuneFacade,
  BlockToolFacade
} from '@editorjs/sdk';
import type {
  EditorConfig,
  ToolSettings as ToolSettingsV2
} from '@editorjs/editorjs';

type ToolConstructor = typeof InlineToolFacade | typeof BlockToolFacade | typeof BlockTuneFacade;

/**
 * Need this utility type to override some V2 options
 */
export type ToolSettings = Omit<ToolSettingsV2, 'constructable' | 'class'> & {
  /**
   * Redefine constructable to match V3
   */
  class: ToolConstructable;
};

/**
 * Factory to construct classes to work with tools
 */
export class ToolsFactory {
  /**
   * Tools configuration specified by user
   */
  #config: Record<string, ToolSettings>;

  /**
   * EditorJS API Module
   */

  #api: EditorAPI;

  /**
   * EditorJS configuration
   */
  #editorConfig: EditorConfig;

  /**
   * Map of tool settings
   */
  #toolsSettings = new Map<string, ToolSettings>();

  /**
   * ToolsFactory
   * @param config - unified tools config for user's and internal tools
   * @param editorConfig - full Editor.js configuration
   * @param api - EditorJS module with all Editor methods
   */
  constructor(
    config: Record<string, ToolSettings>,
    editorConfig: EditorConfig,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    api: any
  ) {
    this.#api = api;
    this.#config = config;
    this.#editorConfig = editorConfig;
  }

  /**
   * Register tools in the factory
   * @param tools - tools to register in the factory
   */
  public setTools(tools: [ToolConstructable, ToolSettings][]): void {
    tools.forEach(([tool, settings]) => {
      this.#toolsSettings.set(tool.name, {
        ...settings,
        class: tool,
      });
    });
  }

  /**
   * Returns Tool object based on it's type
   * @param name - tool name
   */
  public get(name: string): InlineToolFacade | BlockToolFacade | BlockTuneFacade {
    const toolSettings = this.#toolsSettings.get(name);

    if (!toolSettings) {
      throw new Error(`Tool ${name} is not registered`);
    }

    const { class: constructable, ...config } = toolSettings;

    const Constructor = this.#getConstructor(constructable);
    // const isTune = constructable[InternalTuneSettings.IsTune];

    return new Constructor({
      name,
      constructable,
      config,
      api: {},
      // api: this.api.getMethodsForTool(name, isTune),
      isDefault: name === this.#editorConfig.defaultBlock,
      defaultPlaceholder: this.#editorConfig.placeholder,
      /**
       * @todo implement api.getMethodsForTool
       */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  }

  /**
   * Find appropriate Tool object constructor for Tool constructable
   * @param constructable - Tools constructable
   */
  #getConstructor(constructable: ToolConstructable): ToolConstructor {
    switch (constructable.type) {
      case ToolType.Inline:
        return InlineToolFacade;
      case ToolType.Tune:
        return BlockTuneFacade;
      default:
        return BlockToolFacade;
    }
  }
}
