import { BlockNode } from '../BlockNode';

/**
 *
 */
export class DataNode {
  #data: Record<string, unknown>;
  #parent: BlockNode;
}
