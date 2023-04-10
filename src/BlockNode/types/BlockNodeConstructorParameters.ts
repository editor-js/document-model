import { TextNode } from '../../TextNode';
import { ValueNode } from '../../ValueNode';
import { FormattingNode } from '../../FormattingNode';
import { EditorDocument } from '../../EditorDocument';
import { BlockTune, BlockTuneName } from '../../BlockTune';
import { BlockNodeName } from './BlockNodeName';

export interface BlockNodeConstructorParameters {
  /**
   * The name of the tool created a Block
   */
  name: BlockNodeName;

  /**
   * The child nodes of the BlockNode
   */
  children: Record<string, TextNode | ValueNode | FormattingNode>;

  /**
   * The parent EditorDocument of the BlockNode
   */
  parent: EditorDocument;

  /**
   * The BlockTunes associated with the BlockNode
   */
  tunes: Record<BlockTuneName, BlockTune>;
}
