import type { OutputData } from '@editorjs/editorjs';
import type { BlockNodeSerialized, TextNodeSerialized } from '@editorjs/model';

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
              return [
                key, {
                  value: value as TextNodeSerialized,
                  $t: 't',
                },
              ];
            })
        ),
      };
    }),
  };
}
