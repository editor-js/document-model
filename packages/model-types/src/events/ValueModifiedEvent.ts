import type { DataIndex } from '../Index/DataIndex.js';
import type { PartialIndex } from '../Index/PartialIndex.js';
import type { ModifiedEventData } from '../BaseDocumentEvent.js';
import { EventAction } from '../EventAction.js';
import { BaseDocumentEvent } from '../BaseDocumentEvent.js';

/**
 * ValueModified Custom Event
 */
export class ValueModifiedEvent<V = unknown> extends BaseDocumentEvent<EventAction.Modified, ModifiedEventData<V>, DataIndex> {
  /**
   * ValueModifiedEvent class constructor
   * @param index - index of the modified value in the document
   * @param data - event data with new and previous values
   * @param userId - user identifier
   */
  constructor(index: DataIndex | PartialIndex, data: ModifiedEventData<V>, userId: string | number) {
    super(index, EventAction.Modified, data, userId);
  }
}
