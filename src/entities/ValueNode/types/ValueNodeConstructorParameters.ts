import { BlockNode } from '../../BlockNode';

export interface ValueNodeConstructorParameters {
  /**
   * The data associated with the ValueNode
   */
  data: Record<string, unknown>;

  /**
   * The parent BlockNode
   */
  parent: BlockNode;
}
