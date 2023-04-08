import { BlockNode } from '../BlockNode';
import { FormattingNode } from '../FormattingNode';

/**
 *
 */
export class TextNode {
  #value: string;
  #length: number;
  #children: FormattingNode[];
  #parent: BlockNode | FormattingNode;
}
