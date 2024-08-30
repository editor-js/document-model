import { getAbsoluteRangeOffset } from './getAbsoluteRangeOffset.js';
import { splitElement } from './splitElement.js';

/**
 * Unwraps elements of the specified tool type from the passed range
 *
 * In order to work correctly, function requires that there are no nested elements of the same tool type
 *
 * There are three cases we need to consider:
 * 1. Range is contained in the element of the specified tool type
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
    const endNode = splitElement(targetToolAbove, getAbsoluteRangeOffset(startNode, range.endContainer, range.endOffset));
    const midNode = splitElement(targetToolAbove, getAbsoluteRangeOffset(startNode, range.startContainer, range.startOffset)) ?? targetToolAbove;

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
        const newNode = splitElement(node, getAbsoluteRangeOffset(node, range.endContainer, range.endOffset));

        if (newNode) {
          node.after(newNode);
        }

        /**
         * To unwrap the element we just replace with its children
         */
        node.replaceWith(...node.childNodes);
      /**
       * If element ends inside the range, but starts outside, we need to split it at the start of the range
       */
      } else if (!isStartInRange && isEndInRange) {
        const newNode = splitElement(node, getAbsoluteRangeOffset(node, range.startContainer, range.startOffset));

        if (newNode) {
          node.after(newNode);

          /**
           * To unwrap the element we just replace with its children
           */
          newNode.replaceWith(...newNode.childNodes);
        }
      } else {
        /**
         * If element is fully contained in the range, we just replace it with its children
         */
        node.replaceWith(...node.childNodes);
      }
    });
  }
}
