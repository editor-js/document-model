import type { ModifiedEventData } from '../types/EventPayloadBase';
import { EventAction } from '../types/EventAction.js';
import { BaseDocumentEvent } from './BaseEvent.js';
import type { TuneIndex } from '../types/indexing.js';

/**
 * TuneModified Custom Event
 */
export class TuneModifiedEvent<T = unknown> extends BaseDocumentEvent<TuneIndex, EventAction.Modified, ModifiedEventData<T>> {
  /**
   * TuneModifiedEvent class constructor
   *
   * @param index - index of the modified tune in the document
   * @param data - event data with new and previous values
   */
  constructor(index: TuneIndex, data: ModifiedEventData<T>) {
    super(index, EventAction.Modified, data);
  }
}
