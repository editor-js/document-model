import type { EventBus } from './EventBus/EventBus.js';
import type { CoreConfigValidated } from './Config.js';
import type { EditorAPI } from '../api';
import type { EntityType } from './EntityType.js';
import type { EditorjsPluginApiMap, PluginId } from '../index.js';

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
 * Public API a plugin exposes for the given plugin id.
 *
 * Resolves to `never` for an id absent from {@link EditorjsPluginApiMap} — which is what a plugin
 * that forgot to declare its static `name` falls into, since the inherited `Function.name` widens
 * the id to `string`. Declaring a `publicApi` then fails to compile, pointing at the omission.
 *
 * The check is deliberately non-distributive (`[Id] extends [...]`): the default {@link PluginId}
 * is a union including `string & {}`, and a distributive conditional would resolve that union to
 * the known APIs instead of `never`, letting an undeclared plugin slip through.
 */
type PublicApiFor<Id extends PluginId> = [Id] extends [keyof EditorjsPluginApiMap]
  ? EditorjsPluginApiMap[Id]
  : never;

/**
 * Base interface for UI plugins
 */
export interface EditorjsPlugin<
  /**
   * Plugin's identifier, matching its constructor's static `name`
   */
  Id extends PluginId = PluginId
> {
  /**
   * API the plugin exposes to the integrator and to other plugins.
   * Registered under the plugin's `name` and reachable as `api.plugins[name]`.
   */
  publicApi?: PublicApiFor<Id>;

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
   * Plugin's identifier — inferred from the static `name` literal
   */
  Id extends PluginId = PluginId,
  /**
   * Plugin's instance interface. Has to be a generic param as constructor can not be overloaded
   */
  Instance extends EditorjsPlugin<Id> = EditorjsPlugin<Id>
> {
  /**
   * Create new EditorjsPlugin instance
   */
  new (params: EditorjsPluginParams): Instance;

  /**
   * Plugin's entity type: UI plugin, Tool, etc.
   */
  type: EntityType;

  /**
   * Plugin name used to identify the plugin across the editor. Keys both the runtime registry
   * behind `api.plugins` and the {@link EditorjsPluginApiMap} / `ToolPluginOptionsMap` type maps.
   *
   * Declare it as `public static readonly name = 'my-plugin'` so TypeScript infers the literal.
   * Every class inherits `name: string` from `Function`, so omitting the declaration does not fail
   * on its own — it widens the id, which makes any `publicApi` declaration a compile error.
   */
  name: Id;
}
