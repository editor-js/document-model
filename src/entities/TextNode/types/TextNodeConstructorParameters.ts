import { FormattingNode } from '../../FormattingNode';
import { BlockNode } from '../../BlockNode';

export interface TextNodeConstructorParameters {
  /**
   * Text content of the node
   */
  value: string;

  /**
   * Array of child nodes
   */
  children?: FormattingNode[];

  /**
   * A parent of TextNode
   */
  parent: BlockNode | FormattingNode;
}
