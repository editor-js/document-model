import type { Index } from '../../entities/Index/index.js';
import type { ModifiedEventData } from '../types/EventPayloadBase.js';
import { EventAction } from '../types/EventAction.js';
import { BaseDocumentEvent } from './BaseEvent.js';

/**
 * TuneModified Custom Event
 */
export class TuneModifiedEvent<T = unknown> extends BaseDocumentEvent<EventAction.Modified, ModifiedEventData<T>> {
  /**
   * TuneModifiedEvent class constructor
   *
   * @param index - index of the modified tune in the document
   * @param data - event data with new and previous values
   */
  constructor(index: Index, data: ModifiedEventData<T>) {
    super(index, EventAction.Modified, data);
  }
}
