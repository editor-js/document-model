/**
 * Function, that surrounds passed range with passed html element
 *
 * @param range - range to be surrounded
 * @param wrapper - wrapper to surround the range
 */
export function surround(range: Range, wrapper: HTMLElement): void {
  const inlineElement = wrapper;

  const extracted = range.extractContents();

  /**
   * Insert contents from range to new inline element and put created element in range
   */
  inlineElement.appendChild(extracted);

  range.insertNode(inlineElement);
}
