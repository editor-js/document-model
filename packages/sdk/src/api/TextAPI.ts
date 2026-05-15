import type {
  InlineFragment
} from '@editorjs/model';

/**
 * Interface representing text position within a block
 */
interface TextPosition {
  /**
   * Block identifier or index
   */
  block: string | number;
  /**
   * Data key
   */
  key: string;
  /**
   * Text range start
   */
  start?: number;
  /**
   * Text range end
   */
  end?: number;
}

/**
 * Interface representing text content
 */
interface TextContent {
  /**
   * Text content
   */
  text: string;
}

/**
 * Interface representing Inline Tool Data
 */
interface InlineToolData {
  /**
   * Tool name
   */
  tool: string;
  /**
   * Tool data
   */
  data?: Record<string, unknown>;
}

/**
 * Editor's TextAPI to work with text content of the document
 */
export interface TextAPI {
  /**
   * Inserts text at a given position
   * @param params.text - new text to insert
   * @param params.block - block index or identifier
   * @param params.key - data key of the text node
   * @param [params.start] - start offset
   */
  insert(params: TextContent & Omit<TextPosition, 'end'>): void;

  /**
   * Removes text from a given range
   * @param params.block - block index or identifier
   * @param params.key - data key of the text node
   * @param [params.start] - range start
   * @param [params.end] - range end
   */
  remove(params: TextPosition): string;

  /**
   * Formats the given range
   * @param params.tool - tool to apply
   * @param params.block - block index or identifier
   * @param params.key - data key of the text node
   * @param params.start - range start
   * @param params.end - range end
   * @param [params.data] - optional tool's data
   */
  format(params: InlineToolData & Required<TextPosition>): void;

  /**
   * Unformats the given range
   * @param params.tool - tool to remove
   * @param params.block - block index or identifier
   * @param params.key - data key of the text node
   * @param params.start - range start
   * @param params.end - range end
   */
  unformat(params: Pick<InlineToolData, 'tool'> & Required<TextPosition>): void;

  /**
   * Returns applied inline fragments for a given range
   * @param params.block - block index or identifier
   * @param params.key - data key of the text node
   * @param params.start - range start
   * @param params.end - range end
   * @param [params.tool] - optional filter tool. If provided, will return only fragments of the given tool
   */
  getFragments(params: Partial<Pick<InlineToolData, 'tool'>> & TextPosition): InlineFragment[];

  /**
   * Returns text content of the text node
   * @param params.block - block index or identifier
   * @param params.key - data key of the text node
   */
  get(params: Pick<TextPosition, 'block' | 'key'>): string;
}
