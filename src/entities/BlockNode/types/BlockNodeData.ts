import { DataKey } from './DataKey';
import { TextNode } from '../../TextNode';
import { ValueNode } from '../../ValueNode';
import { FormattingNode } from '../../FormattingNode';

/**
 * Represents a record object containing the data of a block node.
 * Each root node is associated with a specific data key.
 */
export type BlockNodeData = Record<DataKey, ValueNode | (FormattingNode | TextNode)[]>;
