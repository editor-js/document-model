import { getNodeTextLength } from './getNodeTextLength';

/**
 * Splits element into two by the offset
 *
 * Function modifies passed node to include only left side of the split and returns right side as a new node (cloned)
 *
 * Function takes into account any subtree of the node
 *
 * @param node - node to split
 * @param offset - offset to split by
 */
export function splitElement(node: HTMLElement, offset: number): null | HTMLElement {
  const nodeTextLength = getNodeTextLength(node)

  if (offset === 0 || offset >= nodeTextLength) {
    return null;
  }

  const newNode = node.cloneNode() as HTMLElement;

  const range = document.createRange();

  range.setStart(node, offset);
  range.setEnd(node, nodeTextLength);

  /**
   * We need to ensure we are including the whole subtree and the node itself
   */
  range.setEndAfter(node.lastChild!);

  const extracted = range.extractContents();

  newNode.append(extracted);

  return newNode;
}
