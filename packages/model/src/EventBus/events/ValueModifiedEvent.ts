import type { Index } from '../../entities/Index/index.js';
import type { ModifiedEventData } from '../types/EventPayloadBase.js';
import { EventAction } from '../types/EventAction.js';
import { BaseDocumentEvent } from './BaseEvent.js';

/**
 * ValueModified Custom Event
 */
export class ValueModifiedEvent<V = unknown> extends BaseDocumentEvent<EventAction.Modified, ModifiedEventData<V>> {
  /**
   * ValueModifiedEvent class constructor
   *
   * @param index - index of the modified value in the document
   * @param data - event data with new and previous values
   */
  constructor(index: Index, data: ModifiedEventData<V>) {
    super(index, EventAction.Modified, data);
  }
}
