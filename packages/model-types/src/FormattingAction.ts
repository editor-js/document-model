/** Describes formatting action type */
export enum FormattingAction {
  /** Apply formatting */
  Format = 'format',
  /** Remove formatting */
  Unformat = 'unformat',
  /** If nothing should happen, tool can send None */
  None = 'none'
}
