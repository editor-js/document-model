import { EditorDocument } from '../EditorDocument';
import { FormattingNode } from '../FormattingNode';
import { TextNode } from '../TextNode';
import { DataNode } from '../DataNode';
import { BlockTune } from '../BlockTune';

/**
 *
 */
export class BlockNode {
  #name: string;
  #children: Record<string, TextNode | DataNode | FormattingNode>;
  #parent: EditorDocument;
  #tunes: Record<string, BlockTune>;
}
