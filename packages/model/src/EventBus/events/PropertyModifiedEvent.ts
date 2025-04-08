import type { Index } from '../../entities/Index/index.js';
import type { ModifiedEventData } from '../types/EventPayloadBase.js';
import { EventAction } from '../types/EventAction.js';
import { BaseDocumentEvent } from './BaseEvent.js';

/**
 * PropertyModified Custom Event
 */
export class PropertyModifiedEvent<P = unknown> extends BaseDocumentEvent<EventAction.Modified, ModifiedEventData<P>> {
  /**
   * PropertyModifiedEvent class constructor
   *
   * @param index - index of the modified property in the document
   * @param data - event data with new and previous values
   * @param userId - user identifier
   */
  constructor(index: Index, data: ModifiedEventData<P>, userId?: string | number) {
    super(index, EventAction.Modified, data, userId);
  }
}
