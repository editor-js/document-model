/* eslint-disable jsdoc/informative-docs */
import type { EditorAPI } from '@editorjs/sdk';
import { ToolType } from '@editorjs/sdk';
import type { ToolConstructable, ToolStaticOptions } from '@editorjs/sdk';
import {
  InlineToolFacade,
  BlockTuneFacade,
  BlockToolFacade
} from '@editorjs/sdk';
import type {
  EditorConfig
} from 'editorjs-v2';

type ToolConstructor = typeof InlineToolFacade | typeof BlockToolFacade | typeof BlockTuneFacade;

/**
 * Full tool registration entry: the constructor class plus its options.
 */
export type ToolSettings = ToolStaticOptions & {
  /**
   * Tool's constructor
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
    api: EditorAPI
  ) {
    this.#api = api;
    this.#config = config;
    this.#editorConfig = editorConfig;
  }

  /**
   * Register tools in the factory
   * @param tools - tools to register in the factory
   */
  public setTools(tools: [ToolConstructable, ToolStaticOptions | undefined][]): void {
    tools.forEach(([tool, settings]) => {
      this.#toolsSettings.set(tool.name, {
        ...(settings ?? {}),
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

    const { class: constructable, ...useToolOptions } = toolSettings;

    const Constructor = this.#getConstructor(constructable);
    // const isTune = constructable[InternalTuneSettings.IsTune];

    return new Constructor({
      name,
      constructable,
      useToolOptions,
      api: this.#api,
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
