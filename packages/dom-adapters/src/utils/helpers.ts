/**
 * Gets offset relatative to the parent node
 *
 * @param parent - parent node
 * @param initialNode - initial node initialOffset is related to
 * @param initialOffset - initial offset
 */
export function getAbsoluteOffset(parent: Node, initialNode: Node, initialOffset: number): number {
  let node = initialNode;
  let offset = initialOffset;

  if (!parent.contains(node)) {
    throw new Error('BlockToolAdapter: range is not contained in the parent node');
  }

  while (!Array.from(node.childNodes)
    .includes(parent as ChildNode)) {
    const childNodes = Array.from(node.parentNode!.childNodes);
    const index = childNodes.indexOf(node as ChildNode);

    offset = childNodes.slice(0, index)
      .reduce((acc, child) => acc + getLength(child), initialNode instanceof Text ? offset : 0);

    node = node.parentNode!;
  }

  return offset;
}

/**
 * Returns length of the node text contents
 *
 * @param node
 */
export function getLength(node: Node): number {
  return node.textContent?.length ?? 0;
}

/**
 * Gets child node by char index (relative to the parent node)
 *
 * @param node - parent node
 * @param index - char index
 *
 * @returns [child, offset] - child node and offset relative to the child node
 */
function findChildByIndex(node: Node, index: number): [child: Node, offset: number] {
  const children = Array.from(node.childNodes);
  let totalLength = 0;

  for (const child of children) {
    if (index <= getLength(child) + totalLength) {
      return [child, totalLength];
    }

    totalLength += getLength(child);
  }


  /**
   * This is unreachable code in normal operation, but we need it to have consistent types
   */
  /* Stryker disable next-line StringLiteral */
  /* istanbul ignore next */
  throw new Error(`Child is not found by ${index} index`);
}

/**
 * Returns DOM Range by char range (relative to input)
 *
 * @param input - input element char indexes are related to
 * @param start - start char index
 * @param end - end char index
 */
export function getRange(input: HTMLElement, start: number, end: number): Range {
  const length = getLength(input);

  if (start < 0 || start > length || end < 0 || end > length) {
    throw new Error('InlineToolAdapter: range is out of bounds');
  }

  let startContainer: Node = input;
  let startOffset = start;
  let endContainer: Node = input;
  let endOffset = end;

  /**
   * Find start node and offset for the range
   */
  while (!(startContainer instanceof Text)) {
    const [child, offset] = findChildByIndex(startContainer, startOffset);

    startContainer = child;
    startOffset = startOffset - offset;
  }

  /**
   * Find end node and offset for the range
   */
  while (!(endContainer instanceof Text)) {
    const [child, offset] = findChildByIndex(endContainer, endOffset);

    endContainer = child;
    endOffset = endOffset - offset;
  }

  const range = new Range();

  /**
   * If startOffset equals to the length of the startContainer, we need to set start after the startContainer
   *
   * However, we also need to consider parent nodes siblings
   */
  if (startOffset === getLength(startContainer)) {
    let nextSibling = startContainer.nextSibling;
    let parent = startContainer.parentNode!;

    while (nextSibling === null && parent !== input) {
      nextSibling = parent.nextSibling;
      parent = parent.parentNode!;
    }

    if (nextSibling !== null) {
      range.setStartBefore(nextSibling);
    } else {
      range.setStartAfter(startContainer);
    }
  } else {
    range.setStart(startContainer, startOffset);
  }

  /**
   * If endOffset equals to 0, we need to set end before the endContainer
   */
  if (endOffset === 0) {
    range.setEndBefore(endContainer);
  /**
   * If endOffset equals to the length of the endContainer, we need to set end after the endContainer
   *
   * We need to consider parent nodes siblings as well
   */
  } else if (endOffset === getLength(endContainer)) {
    let nextSibling = endContainer.nextSibling;
    let parent = endContainer.parentNode!;

    while (nextSibling === null && parent !== input) {
      nextSibling = parent.nextSibling;
      parent = parent.parentNode!;
    }

    if (nextSibling !== null) {
      range.setEndBefore(nextSibling);
    } else {
      range.setEndAfter(endContainer);
    }
  } else {
    range.setEnd(endContainer, endOffset);
  }

  return range;
}

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
function splitElement(node: HTMLElement, offset: number): null | HTMLElement {
  if (offset === 0 || offset === getLength(node)) {
    return null;
  }

  const newNode = node.cloneNode() as HTMLElement;

  const range = getRange(node, offset, getLength(node));

  /**
   * We need to ensure we are including the whole subtree and the node itself
   */
  range.setEndAfter(node.lastChild!);

  const extracted = range.extractContents();

  newNode.append(extracted);

  return newNode;
}

/**
 * Unwraps elements of the specified tool type from the passed range
 *
 * In order to work correctly, function requires that there are no nested elements of the same tool type
 *
 * There are three cases we need to consider:
 * 1. Range is contained in the element of the specified tool type
 * 2. Range contains element or elements of the specified tool type
 * 3. Range intersects with the element of the specified tool type
 *
 * The second and the third cases could appear at the same time
 *
 * @param range - range to unwrap
 * @param targetTool - tool to unwrap
 */
export function unwrapByToolType(range: Range, targetTool: string): void {
  const commonAncestorElement = range.commonAncestorContainer instanceof Text ? range.commonAncestorContainer.parentElement! : range.commonAncestorContainer as HTMLElement;

  /**
   * To cover the first case, we need to check if there are any closest elements with targetTool relative to common ancestor
   */
  const targetToolAbove = commonAncestorElement.closest(`[data-tool="${targetTool}"]`) as HTMLElement | null;

  /**
   * To cover the second and the third cases, we need to check if there are any elements with targetTool contained in the common ancestor
   */
  const targetToolsBelow = Array.from(commonAncestorElement.querySelectorAll(`[data-tool="${targetTool}"]`)) as HTMLElement[];

  /**
   * If no elements are found, there is nothing to unwrap
   */
  if (targetToolAbove === null && targetToolsBelow.length === 0) {
    return;
  }

  /**
   * If range is contained in the element of the specified tool type, we need:
   * 1. to split the element into three
   * 2. to unwrap the middle element (or the start one if middle one is not created by split)
   */
  if (targetToolAbove) {
    const startNode = targetToolAbove;
    const endNode = splitElement(targetToolAbove, getAbsoluteOffset(startNode, range.endContainer, range.endOffset));
    const midNode = splitElement(targetToolAbove, getAbsoluteOffset(startNode, range.startContainer, range.startOffset)) ?? targetToolAbove;

    const newChildren = [ ...midNode.childNodes ];

    if (endNode) {
      newChildren.push(endNode);
    }

    /**
     * To unwrap the element we just replace with its children
     */
    startNode.after(...newChildren);

    return;
  }

  /**
   * If common container contains elements of the specified tool type, for each element we need:
   * 1. check if target range intersects with the element
   * 2. if it does, we need to check if the element is fully contained in the range
   * 3. if it is, we just unwrap the element by replacing it with its children
   * 4. if element is partially intersected, we need to split it into two and unwrap the one inside the range
   */
  if (targetToolsBelow.length > 0) {
    targetToolsBelow.forEach(node => {
      if (!range.intersectsNode(node)) {
        return;
      }

      const isStartInRange = range.isPointInRange(node, 0);
      const isEndInRange = range.isPointInRange(node, node.childNodes.length);

      /**
       * If element starts inside the range, but ends outside, we need to split it at the end of the range
       */
      if (isStartInRange && !isEndInRange) {
        const newNode = splitElement(node, getAbsoluteOffset(node, range.endContainer, range.endOffset));

        if (newNode) {
          node.after(newNode);
        }

      /**
       * If element ends inside the range, but starts outside, we need to split it at the start of the range
       */
      } else if (!isStartInRange && isEndInRange) {
        const newNode = splitElement(node, getAbsoluteOffset(node, range.startContainer, range.startOffset));

        if (newNode) {
          node.before(newNode);
        }
      }

      /**
       * To unwrap the element we just replace with its children
       */
      node.replaceWith(...node.childNodes);
    });
  }
}

/**
 * Normalizes node's subtree to remove nested elements of the same type
 *
 * @param node - node to normalize
 */
export function normalize(node: Node): void {
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

  children.forEach(normalize);
}
