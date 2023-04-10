import { BlockNode } from '../../BlockNode';

export interface DataNodeConstructorParameters {
  /**
   * The data associated with the DataNode
   */
  data: Record<string, unknown>;

  /**
   * The parent BlockNode
   */
  parent: BlockNode;
}
