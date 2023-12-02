/**
 * Normalizes node's subtree to remove nested elements of the same type
 *
 * @param node - node to normalize
 */
export function normalizeNode(node: Node): void {
  const children = Array.from(node.childNodes);

  if (children.length === 0) {
    return;
  }

  children.forEach(child => {
    if (child instanceof Text) {
      return;
    }

    const element = child as HTMLElement;

    if (element.dataset.tool !== undefined) {
      const sameToolNodes = element.querySelectorAll(`[data-tool="${element.dataset.tool}"]`);

      sameToolNodes.forEach(n => n.replaceWith(...n.childNodes));
    }
  });

  children.forEach(normalizeNode);
}
