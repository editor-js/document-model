import type { BlocksAPI } from './BlocksAPI.js';
import type { SelectionAPI } from './SelectionAPI.js';
import type { DocumentAPI } from './DocumentAPI.js';
import type { TextAPI } from './TextAPI.js';
import type { PluginsAPI } from '../index.js';

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

  /**
   * Document API instance to work with Editor's document
   */
  document: DocumentAPI;

  /**
   * Text API to work with the text content of the document
   */
  text: TextAPI;

  /**
   * Public APIs exposed by the registered plugins, keyed by plugin `name`.
   *
   * Every entry is optional: the type map is global to a compilation while the registry is per
   * editor instance, so importing a plugin's types does not mean it was registered here.
   */
  plugins: PluginsAPI;
}
