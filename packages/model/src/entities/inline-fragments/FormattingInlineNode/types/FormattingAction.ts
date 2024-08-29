/**
 * Action that depends on current tool state
 * Inline tool determines formatting action type and sends it to model, which updates data respectfully
 */
export enum FormattingAction {
  /**
   * Apply formatting for selction
   */
  Format = 'format',

  /**
   * Delete formatting for selection
   */
  Unformat = 'unformat',
}
