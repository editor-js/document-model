import { EditorDocument } from '../../EditorDocument';
import { BlockTuneSerialized } from '../../BlockTune';
import { BlockNodeDataSerialized } from './BlockNodeSerialized';

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
