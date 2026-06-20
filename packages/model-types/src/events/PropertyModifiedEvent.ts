import { EventAction } from '../EventAction.js';
import { BaseDocumentEvent } from '../BaseDocumentEvent.js';
import type { Index } from '../Index/index.js';
import type { ModifiedEventData } from '../EventBus.js';

/**
 * PropertyModified Custom Event
 */
export class PropertyModifiedEvent<P = unknown> extends BaseDocumentEvent<EventAction.Modified, ModifiedEventData<P>> {
  /**
   * PropertyModifiedEvent class constructor
   * @param index - index of the modified property in the document
   * @param data - event data with new and previous values
   * @param userId - user identifier
   */
  constructor(index: Index, data: ModifiedEventData<P>, userId: string | number) {
    super(index, EventAction.Modified, data, userId);
  }
}
