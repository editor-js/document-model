import type { ModifiedEventData } from '../types/EventPayloadBase';
import { EventAction } from '../types/EventAction.js';
import type { PropertyIndex } from '../types/indexing';
import { BaseDocumentEvent } from './BaseEvent.js';

/**
 * PropertyModified Custom Event
 */
export class PropertyModifiedEvent<P = unknown> extends BaseDocumentEvent<PropertyIndex, EventAction.Modified, ModifiedEventData<P>> {
  /**
   * PropertyModifiedEvent class constructor
   *
   * @param index - index of the modified property in the document
   * @param data - event data with new and previous values
   */
  constructor(index: PropertyIndex, data: ModifiedEventData<P>) {
    super(index, EventAction.Modified, data);
  }
}
