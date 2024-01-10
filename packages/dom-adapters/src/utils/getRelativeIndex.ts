/**
 * Finds the child node and offset by the given absolute offset
 *
 * @param root - root node
 * @param initialOffset - absolute offset
 */
export function getBoundaryPointByAbsoluteOffset(root: Node, initialOffset: number): [Text, number] {
  let offset = initialOffset;

  const childNodes = Array.from(root.childNodes);

  let i = 0;

  let childNode = childNodes[i];

  while (i < childNodes.length) {
    if (offset <= childNode.textContent!.length) {
      if (!(childNode instanceof Text)) {
        return getBoundaryPointByAbsoluteOffset(childNode, offset);
      }

      return [childNode, offset];
    }

    offset -= childNode.textContent!.length;
    i++;
    childNode = childNodes[i];
  }

  if (childNodes.length === 0) {
    const textNode = new Text();

    root.appendChild(textNode);

    return [textNode, offset];
  }

  return [childNode as Text, offset];
}
