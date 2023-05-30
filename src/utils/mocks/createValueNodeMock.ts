import { createValueNodeName, ValueNode } from '../../entities/ValueNode';
import type { BlockNode } from '../../entities/BlockNode';
import type { ValueNodeName } from '../../entities/ValueNode';

/**
 * Creates a mock ValueNode instance.
 *
 * @param args - ValueNode constructor arguments.
 * @param args.name - The name of this value node.
 * @param args.value - The value of this value node.
 * @param args.parent - The parent BlockNode of this node.
 */
export function createValueNodeMock({ name, value, parent }: { name?: ValueNodeName, value: unknown, parent: BlockNode }): ValueNode {
  return new ValueNode({
    name: name || createValueNodeName('imageUrl'),
    value,
    parent,
  });
}
