import type { Index } from '../Index/index.js';
import type { ModifiedEventData } from '../BaseDocumentEvent.js';
import { EventAction } from '../EventAction.js';
import { BaseDocumentEvent } from '../BaseDocumentEvent.js';

/**
 * ValueModified Custom Event
 */
export class ValueModifiedEvent<V = unknown> extends BaseDocumentEvent<EventAction.Modified, ModifiedEventData<V>> {
  /**
   * ValueModifiedEvent class constructor
   * @param index - index of the modified value in the document
   * @param data - event data with new and previous values
   * @param userId - user identifier
   */
  constructor(index: Index, data: ModifiedEventData<V>, userId: string | number) {
    super(index, EventAction.Modified, data, userId);
  }
}
