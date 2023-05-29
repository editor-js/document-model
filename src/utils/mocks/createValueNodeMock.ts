import { ValueNode } from '../../entities/ValueNode';
import { ValueNodeData } from '../../entities/ValueNode/types';
import { BlockNode } from '../../entities/BlockNode';

/**
 * Creates a mock ValueNode instance.
 *
 * @param args - ValueNode constructor arguments.
 * @param args.data - The data associated with this node.
 * @param args.parent - The parent BlockNode of this node.
 */
export function createValueNodeMock({ data = {}, parent }: { data?: ValueNodeData, parent: BlockNode }): ValueNode {
  return new ValueNode({
    data,
    parent,
  });
}
