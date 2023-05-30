import { ValueNode } from '../../entities/ValueNode';

/**
 * Creates a mock ValueNode instance.
 *
 * @param args - ValueNode constructor arguments.
 * @param args.value - The value of this value node.
 */
export function createValueNodeMock({ value }: { value: unknown }): ValueNode {
  return new ValueNode({
    value,
  });
}
