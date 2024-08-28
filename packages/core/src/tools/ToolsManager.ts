import type { BlockTool } from '../entities/BlockTool.js';
import { Paragraph } from './internal/paragraph/index.js';
import type { EditorConfig } from '@editorjs/editorjs';

/**
 * Works with tools
 */
export default class ToolsManager {
  /**
   * @param tools - Tools configuration passed by user
   */
  constructor(private tools: EditorConfig['tools']) {
  }

  /**
   * Returns a block tool by its name
   * @param toolName - Tool name
   */
  // public resolveBlockTool(toolName: string): BlockTool {
  //   switch (toolName) {
  //     case 'paragraph':
  //       return Paragraph;
  //     default:
  //       throw new Error(`Unknown tool: ${toolName}`);
  //   }
  // }
}
