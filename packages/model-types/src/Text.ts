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

/** Serialized inline tree node containing text value and formatting fragments */
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
