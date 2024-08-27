import type { EditorConfig } from './entities/Config.js';

/**
 * Editor entry poit
 * - initializes Model
 * - subscribes to model updates
 * - creates Adapters for Tools
 * - creates Tools
 * - adds Blocks accodring to model updates
 */
export default class Core {
  /**
   * @param config - Editor configuration
   */
  constructor(config: EditorConfig) {
    console.log('Core constructor', config);
  }
}
