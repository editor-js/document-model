import { getNodeTextLength } from './getNodeTextLength.js';

/**
 * Gets child node by char index (relative to the parent node)
 *
 * @param node - parent node
 * @param index - char index
 *
 * @returns [child, offset] - child node and offset relative to the child node
 */
export function findChildByCharIndex(node: Node, index: number): [child: Node, offset: number] {
  const children = Array.from(node.childNodes);
  let totalLength = 0;

  for (const child of children) {
    if (index <= getNodeTextLength(child) + totalLength) {
      return [child, totalLength];
    }

    totalLength += getNodeTextLength(child);
  }


  /**
   * This is unreachable code in normal operation, but we need it to have consistent types
   */
  /* Stryker disable next-line StringLiteral */
  /* istanbul ignore next */
  throw new Error(`Child is not found by ${index} index`);
}
