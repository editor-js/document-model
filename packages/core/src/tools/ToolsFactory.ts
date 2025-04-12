/* eslint-disable jsdoc/informative-docs */
import type { BlockToolConstructor, EditorAPI, InlineToolConstructor, UnifiedToolConfig } from '@editorjs/sdk';
import {
  InternalInlineToolSettings,
  InternalTuneSettings,
  InlineToolFacade,
  BlockTuneFacade,
  BlockToolFacade
} from '@editorjs/sdk'; ;
import type {
  ToolConstructable,
  EditorConfig,
  InlineToolConstructable,
  BlockTuneConstructable, ToolSettings
} from '@editorjs/editorjs';

type ToolConstructor = typeof InlineToolFacade | typeof BlockToolFacade | typeof BlockTuneFacade;

export type ExtendedToolSettings = ToolSettings & {
  /**
   * Flag shows if a Tool is an internal tool
   * @todo do we need this distinction any more?
   */
  isInternal: boolean;
};

/**
 * Factory to construct classes to work with tools
 */
export class ToolsFactory {
  /**
   * Tools configuration specified by user
   */
  #config: UnifiedToolConfig;

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
  #toolsSettings = new Map<string, ExtendedToolSettings>();

  /**
   * ToolsFactory
   * @param config - unified tools config for user`s and internal tools
   * @param editorConfig - full Editor.js configuration
   * @param api - EditorJS module with all Editor methods
   */
  constructor(
    config: UnifiedToolConfig,
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
  public setTools(tools: [InlineToolConstructor | BlockToolConstructor, ExtendedToolSettings][]): void {
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

    const { class: constructable, isInternal = false, ...config } = toolSettings;

    const Constructor = this.#getConstructor(constructable!);
    // const isTune = constructable[InternalTuneSettings.IsTune];

    return new Constructor({
      name,
      constructable,
      config,
      api: {},
      // api: this.api.getMethodsForTool(name, isTune),
      isDefault: name === this.#editorConfig.defaultBlock,
      defaultPlaceholder: this.#editorConfig.placeholder,
      isInternal,
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
  #getConstructor(constructable: ToolConstructable | BlockToolConstructor | InlineToolConstructor): ToolConstructor {
    switch (true) {
      case (constructable as InlineToolConstructable)[InternalInlineToolSettings.IsInline]:
        return InlineToolFacade;
      case (constructable as BlockTuneConstructable)[InternalTuneSettings.IsTune]:
        return BlockTuneFacade;
      default:
        return BlockToolFacade;
    }
  }
}
