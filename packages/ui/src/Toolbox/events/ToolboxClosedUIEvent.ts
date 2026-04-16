import { ToolboxBaseEvent } from './ToolboxBaseEvent.js';

/**
 * Payload of the ToolboxClosedUIEvent - empty for now
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ToolboxClosedUIEventPayload {}

/**
 * Class for event that is being fired after Toolbox has been closed
 */
export class ToolboxClosedUIEvent extends ToolboxBaseEvent<ToolboxClosedUIEventPayload> {
  /**
   * ToolboxClosedUIEvent constructor function
   * @param payload - ToolboxClosed event payload
   */
  constructor(payload: ToolboxClosedUIEventPayload) {
    super('closed', payload);
  }
}
