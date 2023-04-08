import { TextNode } from '../TextNode';

/**
 *
 */
export class FormattingNode {
  #name: string;
  #data: Record<string, unknown>;
  #length: number; // What is a length for FormattingNode?
  #children: (FormattingNode | TextNode)[];
}
