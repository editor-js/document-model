import type {
  InlineFragment
} from '@editorjs/model';

/**
 * Editor's TextAPI to work with text content of the document
 */
export interface TextAPI {
  /**
   * Inserts text at a given position
   * @param text - new text to insert
   * @param blockIndexOrId - block index or identifier
   * @param dataKey - data key of the text node
   * @param start - start offset
   */
  insert(
    text: string,
    blockIndexOrId: number | string,
    dataKey: string,
    start?: number
  ): void;

  /**
   * Removes text from a given range
   * @param blockIndexOrId - block index or identifier
   * @param dataKey - data key of the text node
   * @param start - range start
   * @param end - range end
   */
  remove(
    blockIndexOrId: number | string,
    dataKey: string,
    start?: number,
    end?: number
  ): string;

  /**
   * Formats the given range
   * @param tool - tool to apply
   * @param blockIndexOrId - block index or identifier
   * @param dataKey - data key of the text node
   * @param start - range start
   * @param end - range end
   * @param data - optional tool's data
   */
  format(
    tool: string,
    blockIndexOrId: number | string,
    dataKey: string,
    start: number,
    end: number,
    data?: Record<string, unknown>,
  ): void;

  /**
   * Unformats the given range
   * @param tool - tool to remove
   * @param blockIndexOrId - block index or identifier
   * @param dataKey - data key of the text node
   * @param start - range start
   * @param end - range end
   */
  unformat(
    tool: string,
    blockIndexOrId: number | string,
    dataKey: string,
    start: number,
    end: number
  ): void;

  /**
   * Returns applied inline fragments for a given range
   * @param blockIndexOrId - block index or identifier
   * @param dataKey - data key of the text node
   * @param start - range start
   * @param end - range end
   * @param tool - optional filter tool. If provided, will return only fragments of the given tool
   */
  getFragments(
    blockIndexOrId: number | string,
    dataKey: string,
    start?: number,
    end?: number,
    tool?: string
  ): InlineFragment[];

  /**
   * Returns text content of the text node
   * @param blockIndexOrId - block index or identifier
   * @param dataKey - data key of the text node
   */
  get(
    blockIndexOrId: number | string,
    dataKey: string
  ): string;
}
