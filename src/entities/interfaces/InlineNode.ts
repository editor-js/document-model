import { InlineToolData, InlineToolName } from '../FormattingNode';

/**
 * Interface describing abstract InlineNode
 */
export interface InlineNode {
  /**
   * Text length of node and it's subtree
   */
  length: number;

  /**
   * Returns text value in passed range
   *
   * @param start - start char index of the range
   * @param end - end char index of the range
   */
  getText(start?: number, end?: number): string;

  /**
   * Applies inline formatting on the passed range
   *
   * @param name - name of Inline Tool to apply
   * @param [start] - start char index of the range
   * @param [end] - end char index of the range
   * @param [data] - Inline Tool data if applicable
   */
  format(name: InlineToolName, start?: number, end?: number, data?: InlineToolData): InlineNode[];

  /**
   * Inserts text at passed char index
   *
   * @param text - text to insert
   * @param [index] - char index where to insert text
   */
  insertText(text: string, index?: number): void;

  /**
   * Removes text from the passed range
   *
   * @param [start] - start char index of the range
   * @param [end] - утв char index of the range
   * @returns {string} removed text
   */
  removeText(start?: number, end?: number): string;

  /**
   * Splits current node at the passed index
   *
   * @param index - char index where to split the node
   * @returns {InlineNode | null} new node if split successful, null if nothing to split
   */
  split(index?: number): InlineNode | null;

  /**
   * Serialized value of the node
   */
  serialized: InlineNodeSerialized;
}

/**
 * Serialized inline fragment
 */
export interface InlineFragment {
  /**
   * Name of the applied Inline Tool
   */
  tool: InlineToolName;

  /**
   * Inline Tool Data if applicable
   */
  data?: InlineToolData;

  /**
   * Range of the fragment
   */
  range: [start: number, end: number];
}

/**
 * Serialized Inline Node value
 */
export interface InlineNodeSerialized {
  /**
   * Text value of the node and its subtree
   */
  text: string;

  /**
   * Fragments which node and its subtree contains
   */
  fragments: InlineFragment[];
}
