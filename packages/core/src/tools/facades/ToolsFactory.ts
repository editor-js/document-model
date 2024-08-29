/* eslint-disable jsdoc/informative-docs */
import type { BlockToolConstructor, InlineToolConstructor } from '@editorjs/sdk';
import { InternalInlineToolSettings, InternalTuneSettings } from './BaseToolFacade.js';
import { InlineToolFacade } from './InlineToolFacade.js';
import { BlockTuneFacade } from './BlockTuneFacade.js';
import { BlockToolFacade } from './BlockToolFacade.js';
// import type ApiModule from '../modules/api';
import type {
  ToolConstructable,
  ToolSettings,
  EditorConfig,
  InlineToolConstructable,
  BlockTuneConstructable
} from '@editorjs/editorjs';

type ToolConstructor = typeof InlineToolFacade | typeof BlockToolFacade | typeof BlockTuneFacade;

export type UnifiedToolConfig = Record<string, Omit<ToolSettings, 'class'> & {
  /**
   * Tool constructor
   */
  class: ToolConstructable | BlockToolConstructor | InlineToolConstructor;

  /**
   * Specifies if tool is internal
   */
  isInternal?: boolean;
}>;

/**
 * Factory to construct classes to work with tools
 */
export class ToolsFactory {
  /**
   * Tools configuration specified by user
   */
  private config: UnifiedToolConfig;

  /**
   * EditorJS API Module
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private api: any;

  /**
   * EditorJS configuration
   */
  private editorConfig: EditorConfig;

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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.api = api;
    this.config = config;
    this.editorConfig = editorConfig;
  }

  /**
   * Returns Tool object based on it's type
   * @param name - tool name
   */
  public get(name: string): InlineToolFacade | BlockToolFacade | BlockTuneFacade {
    const { class: constructable, isInternal = false, ...config } = this.config[name];

    const Constructor = this.getConstructor(constructable);
    // const isTune = constructable[InternalTuneSettings.IsTune];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return new Constructor({
      name,
      constructable,
      config,
      api: {},
      // api: this.api.getMethodsForTool(name, isTune),
      isDefault: name === this.editorConfig.defaultBlock,
      defaultPlaceholder: this.editorConfig.placeholder,
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
  private getConstructor(constructable: ToolConstructable | BlockToolConstructor | InlineToolConstructor): ToolConstructor {
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
