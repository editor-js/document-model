import { TextRange } from "@editorjs/model";
import { doRangesIntersect } from "./doRangesIntersect";
import { InlineTool } from "@editorjs/sdk";

/**
 * Function to remove formatting from of an HTML element
 * Formatting will be removed from range with passed indexes
 * Will remove only formattings with passed tag name
 * @todo - add support for data checking of   
 *  
 * @param element 
 * @param textRange 
 * @param tagName 
 */
export function unformat(element: HTMLElement, textRange: TextRange, tool: InlineTool): void {
  const [start, end] = textRange;

  /**
   * Create a selection range inside of the element
   */
  const range = document.createRange();
  range.setStart(element, 0);
  range.setEnd(element, element.childNodes.length);

  /**
   * Create html tree walker to traverse list of nodes inside of the element
   */
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null);

  let currentOffset = 0;
  const toUnwrap: HTMLElement[] = [];

  while (walker.nextNode()) {
    const currentNode = walker.currentNode;
    
    if (currentNode.nodeType === Node.TEXT_NODE && currentNode.nodeValue !== null) {
      /**
       * We need this case, since typescript can't check for node types
       * And splitText method used for this node later is supported only for text nodes
       */
      let textNode = currentNode as Text;
      const textLength = currentNode.nodeValue.length;
      const nodeStart = currentOffset;
      const nodeEnd = currentOffset + textLength;

      /**
       * If current node intersect with passed text range
       */
      if (doRangesIntersect([nodeStart, nodeEnd], [start, end])) {
        let unwrapped = false;

        /**
         * Get parent node of curent one
         */
        let parentNode: HTMLElement | null = textNode.parentNode as HTMLElement;

        /**
         * 
         */
        while (parentNode && parentNode !== element) {
          console.log(parentNode);

        //   /**
        //    * @todo - make the tag's belonging to the tool more obvious
        //    */
        //   if (parentNode.tagName.toLowerCase() === tagName.toLowerCase()) {
        //     toUnwrap.push(parentNode);
        //     unwrapped = true;
        //     break;
        //   }
        //   parentNode = parentNode.parentNode as HTMLElement;
        }

        if (!unwrapped) {
          const newTextNode = document.createTextNode(currentNode.nodeValue);
          const rangeStart = Math.max(0, start - nodeStart);
          const rangeEnd = Math.min(textLength, end - nodeStart);

          if (rangeStart > 0) {
            textNode.splitText(rangeStart);
            textNode = textNode.nextSibling as Text;
          }

          if (rangeEnd < currentNode.nodeValue.length) {
            textNode.splitText(rangeEnd);
          }

          const rangeToRemove = document.createRange();
          rangeToRemove.selectNode(textNode);
          rangeToRemove.deleteContents();
          rangeToRemove.insertNode(newTextNode);
        }
      }

      currentOffset += textLength;
    } 
    // else if (currentNode.nodeType === Node.ELEMENT_NODE && (currentNode as HTMLElement).tagName.toLowerCase() === tagName.toLowerCase()) {
      // toUnwrap.push(currentNode as HTMLElement);
    // }
  }

  toUnwrap.forEach(node => {
    const parent = node.parentNode;
    while (node.firstChild) {
      parent?.insertBefore(node.firstChild, node);
    }
    parent?.removeChild(node);
  });
}
