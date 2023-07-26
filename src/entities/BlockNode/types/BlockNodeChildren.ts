import { DataKey } from './DataKey';
// import { TextNode } from '../../TextNode';
import { ValueNode } from '../../ValueNode';
// import { FormattingNode } from '../../FormattingNode';

/**
 * Represents a record object containing the children nodes of a block node.
 * Each child node is associated with a specific data key.
 * The record object's properties are the data keys, and their values can either be a single child node or an array of child nodes.
 * The child is the ValueNode if the block node contains the data that will be fully replaced on a change event.
 * If the value is an array, it can contain formatting nodes or text nodes. Changes in these nodes works in a range.
 */
export type BlockNodeChildren = Record<DataKey, ValueNode>;
