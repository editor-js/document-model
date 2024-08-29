import type { InlineToolsConfig, BlockToolConstructor } from '@editorjs/sdk';
import 'reflect-metadata';
import { deepMerge, isFunction, isObject, PromiseQueue } from '@editorjs/helpers';
import { Inject, Service } from 'typedi';
import type { BlockToolFacade, BlockTuneFacade,
  InlineToolFacade } from './facades/index.js';
import {
  ToolsCollection,
  ToolsFactory
} from './facades/index.js';
import { Paragraph } from './internal/block-tools/paragraph/index.js';
import type {
  EditorConfig,
  ToolConstructable,
  ToolSettings
} from '@editorjs/editorjs';
import { InlineTool, InlineToolConstructor } from '@editorjs/sdk';
import type { UnifiedToolConfig } from '../entities/index.js';
import BoldInlineTool from './internal/inline-tools/bold/index.js';
import ItalicInlineTool from './internal/inline-tools/italic/index.js';
import LinkInlineTool from './internal/inline-tools/link/index.js';

/**
 * Works with tools
 * @todo - validate tools configurations
 * @todo - merge internal tools
 */
@Service()
export default class ToolsManager {
  #tools: EditorConfig['tools'];

  /**
   * ToolsFactory instance
   */
  #factory: ToolsFactory;

  /**
   * Unified config with internal and internal tools
   */
  #config: UnifiedToolConfig;

  /**
   * Tools available for use
   */
  #availableTools = new ToolsCollection();

  /**
   * Tools loaded but unavailable for use
   */
  #unavailableTools = new ToolsCollection();

  /**
   * Returns available Tools
   */
  public get available(): ToolsCollection {
    return this.#availableTools;
  }

  /**
   * Returns unavailable Tools
   */
  public get unavailable(): ToolsCollection {
    return this.#unavailableTools;
  }

  /**
   * Return Tools for the Inline Toolbar
   */
  public get inlineTools(): ToolsCollection<InlineToolFacade> {
    return this.available.inlineTools;
  }

  /**
   * Return editor block tools
   */
  public get blockTools(): ToolsCollection<BlockToolFacade> {
    return this.available.blockTools;
  }

  /**
   * Return available Block Tunes
   * @returns - object of Inline Tool's classes
   */
  public get blockTunes(): ToolsCollection<BlockTuneFacade> {
    return this.available.blockTunes;
  }

  /**
   * Returns internal tools
   */
  public get internal(): ToolsCollection {
    return this.available.internalTools;
  }

  /**
   * @param editorConfig - EditorConfig object
   * @param editorConfig.tools - Tools configuration passed by user
   */
  constructor(@Inject('EditorConfig') editorConfig: EditorConfig) {
    this.#config = this.#prepareConfig(editorConfig.tools ?? {});

    this.#validateTools();

    this.#factory = new ToolsFactory(this.#config, editorConfig, {});

    void this.prepareTools();
  }

  /**
   * Calls tools prepare method if it exists and adds tools to relevant collection (available or unavailable tools)
   * @param toolName
   * @returns Promise<void>
   */
  public resolveBlockTool(toolName: string): BlockToolConstructor {
    switch (toolName) {
      case 'paragraph':
        return Paragraph;
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  /**
   * Returns inline tools got from the EditorConfig tools
   */
  public getInlineTools(): InlineToolsConfig {
    return {
      bold: BoldInlineTool,
      italic: ItalicInlineTool,
      link: LinkInlineTool,
    };
  };
}
