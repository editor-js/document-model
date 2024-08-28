import type { OutputData } from '@editorjs/editorjs';
import { TextNode, ValueNode, type BlockNodeSerialized } from '@editorjs/model';

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
                const textNode = new TextNode({ value });

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
