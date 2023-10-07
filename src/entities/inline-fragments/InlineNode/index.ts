import { InlineToolData, InlineToolName } from '../FormattingInlineNode';
import { BlockChildType } from '../../BlockNode/types';

/**
 * Interface describing abstract InlineNode — common properties and methods for all inline nodes
 */
export interface InlineNode {
  /**
   * Text length of node and it's subtree
   */
  readonly length: number;

  /**
   * Serialized value of the node
   */
  readonly serialized: ChildTextNodeSerialized;

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
   * @returns {InlineNode[]} - array of nodes after applied formatting
   */
  format(name: InlineToolName, start?: number, end?: number, data?: InlineToolData): InlineNode[];

  /**
   * Removes inline formatting from the passed range
   *
   * Optional as some nodes don't contain any formatting (e.g. TextInlineNode)
   *
   * @param name - name of Inline Tool to remove
   * @param start - start char index of the range
   * @param end - end char index of the range
   */
  unformat?(name: InlineToolName, start?: number, end?: number): InlineNode[];

  /**
   * Returns inline fragments for subtree including current node from the specified range
   *
   * Optional as some nodes don't contain any formatting (e.g. TextInlineNode)
   *
   * @param [start] - start char index of the range, by default 0
   * @param [end] - end char index of the range, by default length of the text value
   */
  getFragments?(start: number, end: number): InlineFragment[];

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
   * @param [end] - end char index of the range
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
   * Merges current node with passed
   *
   * @param node - node to merge
   */
  mergeWith(node: InlineNode): void;

  /**
   * Check if current node is equal to passed
   *
   * @param node - node to check
   */
  isEqual(node: InlineNode): boolean;

  /**
   * Normalizes nodes subtree
   */
  normalize(): void;
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
export interface ChildTextNodeSerialized {
  /**
   * Text value of the node and its subtree
   */
  text: string;

  /**
   * Fragments which node and its subtree contains
   */
  fragments: InlineFragment[];
}

/**
 * Root type representing serialized TextNode data
 */
export interface TextNodeSerialized extends ChildTextNodeSerialized {
  $t: BlockChildType.Text;
}
