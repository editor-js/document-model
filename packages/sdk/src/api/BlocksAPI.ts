import type { BlockToolData, ToolConfig } from '@editorjs/editorjs';

/**
 * Blocks API interface
 * Provides methods to work with blocks
 */
export interface BlocksAPI {
  /**
   * Inserts a new block to the editor
   * @param type - Block tool name to insert
   * @param data - Block's initial data
   * @param _config - not used but left for compatibility
   * @param index - index to insert block at
   * @param needToFocus - flag indicates if new block should be focused @todo implement
   * @param replace - flag indicates if block at index should be replaced @todo implement
   * @param id - id of the inserted block @todo implement
   */
  insert(
    type?: string,
    data?: BlockToolData,
    _config?: ToolConfig,
    index?: number,
    needToFocus?: boolean,
    replace?: boolean,
    id?: string
  ): void;
} 
