/**
 * Returns length of the node text contents
 *
 * @param node  
 */
export function getNodeTextLength(node: Node): number {
  return node.textContent?.length ?? 0;
}
