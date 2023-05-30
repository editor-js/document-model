import { BlockNode } from '../../BlockNode';
import { ValueNodeName } from './ValueNodeName';

export interface ValueNodeConstructorParameters {
  name: ValueNodeName;

  value: unknown;

  /**
   * The parent BlockNode
   */
  parent: BlockNode;
}
