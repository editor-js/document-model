import type { EditorjsPlugin, EditorjsPluginConstructor } from '@/entities/EditorjsPlugin';
import type { BlockId } from '@editorjs/model';
import type { PluginType } from '@/entities/EntityType';
import type { BlockToolAdapter } from '@/entities/BlockToolAdapter';
import type { BlockTuneAdapter } from '@/entities/BlockTuneAdapter';

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

  /**
   * Factory for the BlockTuneAdapter. Creates and registers an adapter for a
   * specific tune on a specific block.
   * @param blockId - unique identifier of the block
   * @param tuneName - tune to create the adapter for
   */
  createBlockTuneAdapter(blockId: BlockId, tuneName: string): BlockTuneAdapter;

  /**
   * Returns the BlockTuneAdapter for the given block and tune, if one exists.
   * @param blockId - unique identifier of the block
   * @param tuneName - tune to look up the adapter for
   */
  getBlockTuneAdapter(blockId: BlockId, tuneName: string): BlockTuneAdapter | undefined;

  /**
   * Destroys all BlockTuneAdapters for the given block.
   * Called when a block is removed from the model.
   * @param blockId - unique identifier of the removed block
   */
  destroyBlockTuneAdapters(blockId: BlockId): void;
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
