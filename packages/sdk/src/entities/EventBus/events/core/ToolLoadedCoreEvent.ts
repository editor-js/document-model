import type { ToolFacadeClass } from '@/tools/facades/index.js';
import { CoreEventBase } from './CoreEventBase.js';
import { CoreEventType } from './CoreEventType.js';

/**
 * Payload of ToolLoadedCoreEvent custom event
 * Contains laoded tool facade instance
 * @todo replace facade object with API wrapper
 */
export interface ToolLoadedCoreEventPayload {
  /**
   * Loaded tool facade instance
   */
  readonly tool: ToolFacadeClass;
}

/**
 * Class for event that is being fired after the tool is loaded
 */
export class ToolLoadedCoreEvent extends CoreEventBase<ToolLoadedCoreEventPayload> {
  /**
   * ToolLoadedCoreEvent constructor function
   * @param payload - ToolLoaded event payload with loaded tool facade instance
   */
  constructor(payload: ToolLoadedCoreEventPayload) {
    super(CoreEventType.ToolLoaded, payload);
  }
}
