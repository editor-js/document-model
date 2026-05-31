import type { EditorjsPlugin, EditorjsPluginConstructor } from '@/entities/EditorjsPlugin';
import type { BlockId } from '@editorjs/model';
import type { PluginType } from '@/entities/EntityType';
import type { BlockToolAdapter } from '@/entities/BlockToolAdapter';

/**
 * Base interface for adapter plugins
 */
export interface EditorJSAdapterPlugin extends EditorjsPlugin {
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
 */
export interface EditorjsAdapterPluginConstructor extends EditorjsPluginConstructor<EditorJSAdapterPlugin> {
  /**
   * Marks the plugin as a singleton adapter, replaceable via core.use()
   */
  type: PluginType.Adapter;
}
