import { ToolboxBaseEvent } from './ToolboxBaseEvent.js';

/**
 * Payload of the ToolboxOpenedUIEvent -- empty for now
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ToolboxOpenedUIEventPayload {}

/**
 * Class for event that is being fired after Toolbox has been opened
 */
export class ToolboxOpenedUIEvent extends ToolboxBaseEvent<ToolboxOpenedUIEventPayload> {
  /**
   * ToolboxOpenedUIEvent constructor function
   * @param payload - ToolboxOpened event payload
   */
  constructor(payload: ToolboxOpenedUIEventPayload) {
    super('opened', payload);
  }
}
