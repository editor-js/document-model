import { EditorDocument } from '../../EditorDocument';
import { BlockTune, BlockTuneName } from '../../BlockTune';
import { BlockNodeName } from './BlockNodeName';
import { BlockNodeChildren } from './BlockNodeChildren';

export interface BlockNodeConstructorParameters {
  /**
   * The name of the tool created a Block
   */
  name: BlockNodeName;

  /**
   * The child nodes of the BlockNode
   */
  children: BlockNodeChildren;

  /**
   * The parent EditorDocument of the BlockNode
   */
  parent: EditorDocument;

  /**
   * The BlockTunes associated with the BlockNode
   */
  tunes: Record<BlockTuneName, BlockTune>;
}
