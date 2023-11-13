/**
 * Enumeration of the possible event actions
 */
export enum EventAction {
  /**
   * Event indicating that some new information was added to the document model
   */
  Added = 'added',

  /**
   * Event indicating that some information was removed from the document model
   */
  Removed = 'removed',

  /**
   * Event indicating that some existing information was modified in the document model
   */
  Modified = 'modified',
}
