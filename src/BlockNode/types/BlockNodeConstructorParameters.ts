import { TextNode } from '../../TextNode';
import { DataNode } from '../../DataNode';
import { FormattingNode } from '../../FormattingNode';
import { EditorDocument } from '../../EditorDocument';
import { BlockTune } from '../../BlockTune';

export interface BlockNodeConstructorParameters {
  /**
   * The name of the BlockNode
   */
  name: string;

  /**
   * The child nodes of the BlockNode
   */
  children: Record<string, TextNode | DataNode | FormattingNode>;

  /**
   * The parent EditorDocument of the BlockNode
   */
  parent: EditorDocument;

  /**
   * The BlockTunes associated with the BlockNode
   */
  tunes: Record<string, BlockTune>;
}
