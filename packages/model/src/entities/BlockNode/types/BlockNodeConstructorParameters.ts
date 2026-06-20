import type { EditorDocument } from '../../EditorDocument/index.js';
import type { BlockTuneSerialized } from '../../BlockTune/index.js';
import type { BlockNodeDataSerialized } from './BlockNodeSerialized.js';
import type { BlockId } from '@editorjs/model-types';

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
   * The BlockTunes associated with the BlockNode
   */
  tunes?: Record<string, BlockTuneSerialized>;
}
