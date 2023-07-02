import { EditorDocument } from '../../EditorDocument';
import { BlockTune, BlockTuneName } from '../../BlockTune';
import { BlockNodeName } from './BlockNodeName';
import { BlockNodeData } from './BlockNodeData';

export interface BlockNodeConstructorParameters {
  /**
   * The name of the tool created a Block
   */
  name: BlockNodeName;

  /**
   * The content of the Block
   */
  data: BlockNodeData;

  /**
   * The parent EditorDocument of the BlockNode
   */
  parent: EditorDocument;

  /**
   * The BlockTunes associated with the BlockNode
   */
  tunes?: Record<BlockTuneName, BlockTune>;
}
