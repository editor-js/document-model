/**
 *
 * @param root
 * @param initialOffset
 */
export function getRelativeRangeIndex(root: Node, initialOffset: number): [Text, number] {
  let offset = initialOffset;

  const childNodes = Array.from(root.childNodes);

  let i = 0;

  let childNode = childNodes[i];

  while (i < childNodes.length) {
    if (offset <= childNode.textContent!.length) {
      if (!(childNode instanceof Text)) {
        return getRelativeRangeIndex(childNode, offset);
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
