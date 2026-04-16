import { ToolboxBaseEvent } from './ToolboxBaseEvent.js';

/**
 * Payload of the ToolboxOpenUIEvent -- empty for now
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ToolboxOpenUIEventPayload {}

/**
 * Class for event that is being fired when Toolbox should be opened
 */
export class ToolboxOpenUIEvent extends ToolboxBaseEvent<ToolboxOpenUIEventPayload> {
  /**
   * ToolboxOpenUIEvent constructor function
   * @param payload - ToolboxOpen event payload
   */
  constructor(payload: ToolboxOpenUIEventPayload) {
    super('open', payload);
  }
}
