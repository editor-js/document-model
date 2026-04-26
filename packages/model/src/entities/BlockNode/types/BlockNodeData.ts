import type { DataKey } from './DataKey.js';
import type { ValueNode } from '../../ValueNode/index.js';
import type { TextNode } from '../../inline-fragments/index.js';

export type ChildNode = ValueNode | TextNode;

/**
 * Represents a record object containing the data of a block node.
 * Each root node is associated with a specific data key.
 */
export interface BlockNodeData {
  [key: DataKey]: BlockNodeDataValue;
}

export type BlockNodeDataValue = ChildNode | ChildNode[] | BlockNodeData | BlockNodeData[];
