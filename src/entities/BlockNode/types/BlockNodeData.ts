import { DataKey } from './DataKey';
import { ValueNode } from '../../ValueNode';
import { RootInlineNode } from '../../inline-fragments';

/**
 * Represents a record object containing the data of a block node.
 * Each root node is associated with a specific data key.
 */
export type BlockNodeData = Record<DataKey, ValueNode | RootInlineNode>;
