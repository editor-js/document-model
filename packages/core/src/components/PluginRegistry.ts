import 'reflect-metadata';
import { injectable } from 'inversify';
import type { PluginId, PluginsAPI } from '@editorjs/sdk';

/**
 * Holds the public APIs exposed by the registered plugins, keyed by plugin `name`.
 *
 * The record handed out by {@link api} is created once and mutated in place as plugins are
 * constructed. Plugins receive the `EditorAPI` in their constructor — before later plugins exist —
 * so handing out a snapshot would permanently hide anything registered afterwards. Sharing one
 * object means a read performed at call time (after `core:ready`) always sees the full registry.
 */
@injectable()
export class PluginRegistry {
  /**
   * The shared record backing `api.plugins`
   */
  readonly #record: Record<string, unknown> = {};

  /**
   * Registry of plugin public APIs, as exposed through `api.plugins`
   */
  public get api(): PluginsAPI {
    return this.#record as PluginsAPI;
  }

  /**
   * Adds a plugin's public API to the registry
   * @param name - plugin's `name`, used as the registry key
   * @param publicApi - the API object the plugin exposes
   * @throws When the name is empty or already taken by another plugin
   */
  public register(name: PluginId, publicApi: unknown): void {
    if (name === '') {
      throw new Error('Editor.js plugin must have a non-empty "name" to expose a public API');
    }

    if (name in this.#record) {
      throw new Error(`Editor.js plugin with name "${name}" is already registered. Plugin names must be unique`);
    }

    this.#record[name] = publicApi;
  }

  /**
   * Removes a plugin's public API from the registry, so no stale API stays reachable
   * @param name - key the plugin's API was registered under
   */
  public unregister(name: PluginId): void {
    delete this.#record[name];
  }
}
