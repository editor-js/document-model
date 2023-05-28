import { BlockNode, BlockNodeName, createBlockNodeName } from '../../entities/BlockNode';
import { EditorDocument } from '../../entities/EditorDocument';

/**
 * Creates a BlockNode with the specified name and adds it to the specified parent.
 *
 * @param args - The arguments to pass to the BlockNode constructor.
 * @param args.name - The name of the BlockNode.
 * @param args.parent - The parent of the BlockNode.
 */
export function createBlockNodeMock({ name, parent }: { name?: BlockNodeName, parent: EditorDocument }): BlockNode {
  return new BlockNode({
    name: name || createBlockNodeName('header'),
    parent,
    children: {},
  });
}
