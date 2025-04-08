/**
 * Enumeration of core events
 */
export enum CoreEventType {
  /**
   * Event is fired when a block is added to the Editor
   */
  BlockAdded = 'block:added',
  /**
   * Event is fired when a block is removed from the Editor
   */
  BlockRemoved = 'block:removed',
  /**
   * Event is fired when a tool is loaded
   */
  ToolLoaded = 'tool:loaded',

  /**
   * Event is fired when InlineTool instance is created
   */
  InlineToolCreated = 'tool:inline-tool-created',

  /**
   * Event is fired when the selection is changed
   */
  SelectionChanged = 'selection:changed',

  /**
   * Event is fired when undo action should be performed
   */
  Undo = 'undo',

  /**
   * Event is fired when redo action should be performed
   */
  Redo = 'redo'
}
