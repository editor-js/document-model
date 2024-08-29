import type { InlineToolsConfig } from '../entities/InlineTool.js';
import type { BlockToolConstructor } from '../entities/BlockTool.js';
import { Paragraph } from './internal/block-tools/paragraph/index.js';
import type { EditorConfig } from '@editorjs/editorjs';
import BoldInlineTool from './internal/inline-tools/bold/index.js';
import ItalicInlineTool from './internal/inline-tools/italic/index.js';

/**
 * Works with tools
 */
export default class ToolsManager {
  #tools: EditorConfig['tools'];

  /**
   * @param tools - Tools configuration passed by user
   */
  constructor(tools: EditorConfig['tools']) {
    this.#tools = tools;
  }

  /**
   * Returns a block tool by its name
   * @param toolName - name of a tool to resolve
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
    };
  };
}
