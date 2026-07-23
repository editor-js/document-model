import type { EditorjsPlugin, EditorjsPluginConstructor } from './EditorjsPlugin';
import type { BlockId } from '@editorjs/model-types';
import type { PluginType } from './EntityType';
import type { BlockToolAdapter } from './BlockToolAdapter';
import type { PluginId } from '../index.js';

/**
 * Base interface for adapter plugins
 * @template Id - adapter's identifier, taken from its static `name`
 */
export interface EditorJSAdapterPlugin<Id extends PluginId = PluginId> extends EditorjsPlugin<Id> {
  /**
   * Factory for the BlockToolAdapter. Called when a new block should be rendered
   * @param blockId - unique identifier of the added block
   * @param name - tool name
   */
  createBlockToolAdapter(blockId: BlockId, name: string): BlockToolAdapter;

  /**
   * Destroys the BlockToolAdapter for the given block.
   * Cleans up all inputs registered for this block and removes the adapter instance.
   * Called when a block is removed from the model.
   * @param blockId - unique identifier of the removed block
   */
  destroyBlockToolAdapter(blockId: BlockId): void;
}

/**
 * Constructor type for adapter plugins
 * @template Id - adapter's identifier, taken from its static `name`
 */
export interface EditorjsAdapterPluginConstructor<
  Id extends PluginId = PluginId
> extends EditorjsPluginConstructor<Id, EditorJSAdapterPlugin<Id>> {
  /**
   * Marks the plugin as a singleton adapter, replaceable via core.use()
   */
  type: PluginType.Adapter;
}
