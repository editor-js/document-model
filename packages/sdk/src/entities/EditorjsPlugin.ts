import type { EventBus } from '@/entities/EventBus/EventBus.js';
import type { CoreConfigValidated } from '@/entities/Config.js';
import type { EditorAPI } from '@/api/EditorAPI.js';
import type { EntityType } from '@/entities/EntityType.js';

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
export interface EditorjsPluginConstructor<
  /**
   * Plugin's params. Has to be a generic param as constructor can not be overloaded
   */
  Params extends EditorjsPluginParams = EditorjsPluginParams,
  /**
   * Plugin's instance interface. Has to be a generic param as constructor can not be overloaded
   */
  Instance extends EditorjsPlugin = EditorjsPlugin
> {
  /**
   * Create new EditorjsPlugin instance
   */
  new (params: Params): Instance;

  /**
   * Plugin's entity type: UI plugin, Tool, etc.
   */
  type: EntityType;
}
