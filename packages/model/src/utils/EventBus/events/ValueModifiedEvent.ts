import type { ModifiedEventData } from '../types/EventPayloadBase';
import { EventAction } from '../types/EventAction.js';
import type { ValueIndex } from '../types/indexing';
import { BaseDocumentEvent } from './BaseEvent.js';

/**
 * ValueModified Custom Event
 */
export class ValueModifiedEvent<V = unknown> extends BaseDocumentEvent<ValueIndex, EventAction.Modified, ModifiedEventData<V>> {
  /**
   * ValueModifiedEvent class constructor
   *
   * @param index - index of the modified value in the document
   * @param data - event data with new and previous values
   */
  constructor(index: ValueIndex, data: ModifiedEventData<V>) {
    super(index, EventAction.Modified, data);
  }
}
