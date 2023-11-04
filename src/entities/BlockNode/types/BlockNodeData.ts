import { DataKey } from './DataKey';
import { ValueNode } from '../../ValueNode';
import { TextNode } from '../../inline-fragments';

export type ChildNode = ValueNode | TextNode;

/**
 * Represents a record object containing the data of a block node.
 * Each root node is associated with a specific data key.
 */
export interface BlockNodeData {
  [key: DataKey]: BlockNodeDataValue;
}

export type BlockNodeDataValue = ChildNode | ChildNode[] | BlockNodeData | BlockNodeData[];
