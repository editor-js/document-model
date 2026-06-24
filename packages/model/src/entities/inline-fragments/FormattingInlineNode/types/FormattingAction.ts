/**
 * Action that depends on current tool state
 * Inline tool determines formatting action type and sends it to model, which updates data respectfully
 */
export enum FormattingAction {
  /**
   * Apply formatting for selection
   */
  Format = 'format',

  /**
   * Delete formatting for selection
   */
  Unformat = 'unformat',

  /**
   * If nothing should happen, tool can send None
   */
  None = 'none'
}
