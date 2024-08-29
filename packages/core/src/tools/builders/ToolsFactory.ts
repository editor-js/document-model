import { InternalInlineToolSettings, InternalTuneSettings } from './BaseToolBuilder.js';
import { InlineToolBuilder } from './InlineToolBuilder.js';
import { BlockTuneBuilder } from './BlockTuneBuilder.js';
import { BlockToolBuilder } from './BlockToolBuilder.js';
// import type ApiModule from '../modules/api';
import type {
  ToolConstructable,
  ToolSettings,
  EditorConfig,
  InlineToolConstructable,
  BlockTuneConstructable
} from '@editorjs/editorjs';

type ToolConstructor = typeof InlineToolBuilder | typeof BlockToolBuilder | typeof BlockTuneBuilder;

export type UnifiedToolConfig = Record<string, Omit<ToolSettings, 'class'> & {
  class: ToolConstructable;
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
  private api: any;

  /**
   * EditorJS configuration
   */
  private editorConfig: EditorConfig;

  /**
   * @param config - tools config
   * @param editorConfig - EditorJS config
   * @param api - EditorJS API module
   */
  constructor(
    config: UnifiedToolConfig,
    editorConfig: EditorConfig,
    api: any
  ) {
    this.api = api;
    this.config = config;
    this.editorConfig = editorConfig;
  }

  /**
   * Returns Tool object based on it's type
   * @param name - tool name
   */
  public get(name: string): InlineToolBuilder | BlockToolBuilder | BlockTuneBuilder {
    const { class: constructable, isInternal = false, ...config } = this.config[name];

    const Constructor = this.getConstructor(constructable);
    // const isTune = constructable[InternalTuneSettings.IsTune];

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
    } as any);
  }

  /**
   * Find appropriate Tool object constructor for Tool constructable
   * @param constructable - Tools constructable
   */
  private getConstructor(constructable: ToolConstructable): ToolConstructor {
    switch (true) {
      case (constructable as InlineToolConstructable)[InternalInlineToolSettings.IsInline]:
        return InlineToolBuilder;
      case (constructable as BlockTuneConstructable)[InternalTuneSettings.IsTune]:
        return BlockTuneBuilder;
      default:
        return BlockToolBuilder;
    }
  }
}
