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
 * Optional user id parameter for mutating operations
 */
interface UserIdParam {
  /**
   * User id. Defaults to the current user id from the config
   */
  userId?: string | number;
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
   * @param [params.userId] - user id. Defaults to the current user id from the config
   */
  insert(params: TextContent & Omit<TextPosition, 'end'> & UserIdParam): void;

  /**
   * Removes text from a given range
   * @param params.block - block index or identifier
   * @param params.key - data key of the text node
   * @param [params.start] - range start
   * @param [params.end] - range end
   * @param [params.userId] - user id. Defaults to the current user id from the config
   */
  remove(params: TextPosition & UserIdParam): string;

  /**
   * Formats the given range
   * @param params.tool - tool to apply
   * @param params.block - block index or identifier
   * @param params.key - data key of the text node
   * @param params.start - range start
   * @param params.end - range end
   * @param [params.data] - optional tool's data
   * @param [params.userId] - user id. Defaults to the current user id from the config
   */
  format(params: InlineToolData & Required<TextPosition> & UserIdParam): void;

  /**
   * Unformats the given range
   * @param params.tool - tool to remove
   * @param params.block - block index or identifier
   * @param params.key - data key of the text node
   * @param params.start - range start
   * @param params.end - range end
   * @param [params.userId] - user id. Defaults to the current user id from the config
   */
  unformat(params: Pick<InlineToolData, 'tool'> & Required<TextPosition> & UserIdParam): void;

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
