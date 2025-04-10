import { EventBus } from '@/entities/EventBus/EventBus.js';
import type { CoreConfigValidated } from '@/entities/Config.js';
import type { EditorAPI } from '@/api/EditorAPI.js';

/**
 * Parameters for EditorjsPlugin constructor
 */
export interface EditorjsPluginParams {
  /**
   * EditorJS config
   */
  config: CoreConfigValidated;

  /**
   * EditorAPI instance
   */
  api: EditorAPI;

  /**
   * EventBus instance
   */
  eventBus: EventBus;
}

/**
 * Base interface for UI plugins
 */
export interface EditorjsPlugin {
  /**
   * Destroy plugin instance
   */
  destroy?(): void;
}

/**
 * Constructor type for EditorjsPlugin
 */
export interface EditorjsPluginConstructor {
  /**
   * Create new EditorjsPlugin instance
   */
  new (params: EditorjsPluginParams): EditorjsPlugin;

  /**
   * Plugin type
   */
  type: string;
}
