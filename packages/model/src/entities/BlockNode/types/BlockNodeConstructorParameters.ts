import type { EditorDocument } from '../../EditorDocument/index.js';
import type { BlockTuneSerialized } from '../../BlockTune/index.js';
import type { BlockNodeDataSerialized } from './BlockNodeSerialized.js';

export interface BlockNodeConstructorParameters {
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
