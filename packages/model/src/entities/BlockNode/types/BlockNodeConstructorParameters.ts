import type { EditorDocument } from '../../EditorDocument/index.js';
import type { BlockId, BlockNodeDataSerialized, PluginDataSerialized } from '@editorjs/model-types';

export interface BlockNodeConstructorParameters {
  /**
   * Unique identifier of the Block.
   * If not provided, a new UUID will be generated.
   */
  id?: BlockId | string;

  /**
   * The name of the tool created a Block
   */
  name: string;

  /**
   * The content of the Block
   */
  data?: BlockNodeDataSerialized;

  /**
   * The parent EditorDocument of the BlockNode
   */
  parent?: EditorDocument;

  /**
   * Per-plugin data associated with the BlockNode, keyed by plugin name
   */
  plugins?: Record<string, PluginDataSerialized>;
}
