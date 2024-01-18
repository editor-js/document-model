/**
 * Returns true if node is a line break
 *
 * <div>
 *   <div>
 *     <br>
 *   </div>
 * </div>
 *
 * @param node - node to check
 */
function isLineBreak(node: Node): boolean {
  return node.textContent?.length === 0 && node.nodeType === Node.ELEMENT_NODE && (node as Element).querySelector('br') !== null;
}

/**
 * Returns absolute caret offset from caret position in container to the start of the parent node (input)
 *
 * @param parent - parent node containing the range
 * @param initialNode - exact node containing the caret
 * @param initialOffset - caret offset in the initial node
 */
export function getAbsoluteRangeOffset(parent: Node, initialNode: Node, initialOffset: number): number {
  let node = initialNode;
  let offset = initialOffset;


  if (!parent.contains(node)) {
    throw new Error('Range is not contained by the parent node');
  }

  if (parent === node) {
    return node instanceof Text ? offset : 0;
  }

  /**
   * Iterate over all parents and compute offset
   */
  do {
    const childNodes = Array.from(node.parentNode!.childNodes);
    const index = childNodes.indexOf(node as ChildNode);

    /**
     * Iterate over left siblings and compute offset
     */
    offset = childNodes.slice(0, index)
      .reduce((acc, child) => {
        /**
         * Support for line breaks
         */
        if (isLineBreak(child)) {
          return acc + 1;
        }

        /**
         * Compute offset with text length of left siblings
         */
        return acc + (child.textContent?.length ?? 0);

        /**
         * If initial node is a text node, then we need to add initial offset to the result
         */
      }, initialNode instanceof Text ? offset : 0);

    node = node.parentNode!;
  } while (node !== parent);

  return offset;
}
