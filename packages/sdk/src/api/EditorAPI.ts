import type { BlocksAPI } from './BlocksAPI.js';
import type { SelectionAPI } from './SelectionAPI.js';

/**
 * Editor API interface
 * Gathers all Editor's APIs
 */
export interface EditorAPI {
  /**
   * Blocks API instance to work with blocks
   */
  blocks: BlocksAPI;

  /**
   * Selection API instance to work with selection and inline formatting
   */
  selection: SelectionAPI;
}
