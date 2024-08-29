import type { OutputData } from '@editorjs/editorjs';
import type { InlineFragment } from '@editorjs/model';
import { createInlineToolData, createInlineToolName, TextNode, ValueNode, type BlockNodeSerialized } from '@editorjs/model';

/**
 * Extracts inline fragments from the HTML string
 * @param html - any html string like '<b>bold</b> <a href="https://editorjs.io">link</a>'
 *
 * NOW ONLY <b>, <strong> AND <a> TAGS ARE SUPPORTED
 * @todo support all inline tools
 */
function extractFragments(html: string): InlineFragment[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const fragments: InlineFragment[] = [];
  let index = 0;

  /**
   * Traverses children of the parent node
   * @param parent - parent node
   * @param startIndex - start index of the text
   */
  function traverseChildren(parent: HTMLElement, startIndex: number): number {
    parent.childNodes.forEach((child) => {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      startIndex = traverse(child, startIndex);
    });

    return startIndex;
  }

  /**
   * Traverses the node and its children
   * @param node - node to traverse
   * @param startIndex - start index of the text
   */
  function traverse(node: ChildNode, startIndex: number): number {
    if (node.nodeType === Node.TEXT_NODE) {
      index += node.textContent?.length ?? 0;

      return index;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();
      const currentStartIndex = startIndex;

      if (tagName === 'b' || tagName === 'strong') {
        index = traverseChildren(element, startIndex);
        fragments.push({
          tool: createInlineToolName('bold'),
          range: [currentStartIndex, index],
        });
      } else if (tagName === 'a') {
        const href = element.getAttribute('href') ?? '';

        index = traverseChildren(element, startIndex);
        fragments.push({
          tool: createInlineToolName('link'),
          data: createInlineToolData({
            href,
          }),
          range: [currentStartIndex, index],
        });
      } else {
        index = traverseChildren(element, startIndex);
      }
    }

    return index;
  }

  traverseChildren(doc.body, 0);

  return fragments;
}

/**
 * Converst OutputData from version 2 to version 3
 * @param data - OutputData from version 2
 */
export function composeDataFromVersion2(data: OutputData): {
  /**
   * The child BlockNodes of the EditorDocument
   */
  blocks: BlockNodeSerialized[];
} {
  return {
    blocks: data.blocks.map((block) => {
      return {
        name: block.type,
        data: Object.fromEntries(
          Object
            .entries(block.data as Record<string, unknown>)
            .map(([key, value]) => {
              if (typeof value === 'string') {
                const fragments = extractFragments(value);
                const textNode = new TextNode({
                  value,
                  fragments,
                });

                return [
                  key, textNode.serialized,
                ];
              } else {
                const valueNode = new ValueNode({ value });

                return [
                  key, valueNode.serialized,
                ];
              }
            })
        ),
      };
    }),
  };
}
