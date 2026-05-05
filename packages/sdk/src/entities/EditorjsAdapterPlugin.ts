import type { EditorjsPlugin, EditorjsPluginConstructor, EditorjsPluginParams } from '@/entities/EditorjsPlugin';
import type { EditorJSModel } from '@editorjs/model';
import type { PluginType } from '@/entities/EntityType';
import type { BlockToolAdapter } from '@/entities/BlockToolAdapter';

/**
 * Parameters for adapter plugin constructor.
 * Extends standard plugin params with direct model access for low-level operations.
 */
export interface EditorjsAdapterPluginParams extends EditorjsPluginParams {
  /**
   * Editor's document model instance
   */
  model: EditorJSModel;
}

/**
 * Base interface for adapter plugins
 */
export interface EditorJSAdapterPlugin extends EditorjsPlugin {
  /**
   * Factory for the BlockToolAdapter. Called when a new block should be rendered
   * @param blockIndex - index of the added block
   * @param name - tool name
   */
  createBlockToolAdapter(blockIndex: number, name: string): BlockToolAdapter;
  /**
   * Destroys the BlockToolAdapter for the block at the given index.
   * Called by BlockRenderer when a block is removed from the model.
   * @param blockIndex - index of the removed block
   */
  destroyBlockToolAdapter(blockIndex: number): void;
}

/**
 * Constructor type for adapter plugins
 */
export interface EditorjsAdapterPluginConstructor extends EditorjsPluginConstructor<EditorjsAdapterPluginParams, EditorJSAdapterPlugin> {
  /**
   * Marks the plugin as a singleton adapter, replaceable via core.use()
   */
  type: PluginType.Adapter;
}
