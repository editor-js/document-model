import type { InlineToolData, InlineToolName } from './InlineTool.js';
import type { BlockChildType, NODE_TYPE_HIDDEN_PROP } from './BlockChildType.js';

/** Range represented as [start, end] */
export type TextRange = [number, number];

/** Fragment of text with inline formatting tool applied */
export interface InlineFragment {
  /** Inline tool name used for formatting */
  tool: InlineToolName;
  /** Optional data passed to the inline tool */
  data?: InlineToolData;
  /** Character range the formatting applies to */
  range: [start: number, end: number];
}

/**
 * Serialized text value with its formatting fragments
 * @todo Rename: the model no longer stores inline formatting as a tree (TextNode keeps runs), so "InlineTree" is misleading.
 *       It is a public type, so the rename is breaking and needs a major release
 */
export interface InlineTreeNodeSerialized {
  /** Text content */
  value: string;
  /** Formatting fragments applied to the text */
  fragments: InlineFragment[];
}

/** Text node data extending serialized inline tree with hidden type marker */
export interface TextNodeSerialized extends InlineTreeNodeSerialized {
  /** Hidden property marking this node as a text child */
  [NODE_TYPE_HIDDEN_PROP]: BlockChildType.Text;
}
