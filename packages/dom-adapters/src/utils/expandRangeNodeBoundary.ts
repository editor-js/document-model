
/**
 * Method that expands range node-boundary to the highest encestor of the current node with same absolute offset
 * It is used to find node-boundary for range.setStartAfter or range.setEndBefore methods
 * This method solves issue with leaving empty tags after range.extractContents()
 *
 * @param currentNode - Node to start expanding from
 * @param end - If true, expands end boundary of the range. If false/undefined, expands start boundary of the range
 * @returns The highest node that is still a first/last child, or the original node if no expansion needed
 */
export function expandRangeNodeBoundary(currentNode: Node, end?: boolean): Node {
  let node = currentNode;

  if (end) {
    while (!(node.parentNode instanceof HTMLElement && node.parentNode.getAttribute('contenteditable') === 'true')) {
      if (node.parentNode && node === node.parentNode.lastChild) {
        node = node.parentNode;
      } else {
        return node;
      }
    }
  } else {
    while (
      node.parentNode && 
      node === node.parentNode.firstChild &&
      !(node.parentNode instanceof HTMLElement && node.parentNode.getAttribute('contenteditable') === 'true')
    ) {
      node = node.parentNode;
    }
  }

  return node;
}


