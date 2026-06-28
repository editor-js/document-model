/**
 * Event types enum that can be emitted by the document model
 */
export enum EventType {
  /**
   * The document model has been changed
   */
  Changed = 'model:changed',

  /**
   * The position of caret has been updated
   */
  CaretManagerUpdated = 'model:caret-updated'
}
