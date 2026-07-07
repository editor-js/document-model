/** Hidden property name used to mark block child nodes */
export const NODE_TYPE_HIDDEN_PROP = '$t';

/** Describes the type of a block child node */
export enum BlockChildType {
  /** Node stores a value */
  Value = 'v',
  /** Node stores text with inline formatting */
  Text = 't'
}
