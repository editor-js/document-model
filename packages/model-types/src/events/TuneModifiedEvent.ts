import { EventAction } from '../EventAction.js';
import { BaseDocumentEvent } from '../BaseDocumentEvent.js';
import type { Index } from '../Index/index.js';
import type { ModifiedEventData } from '../EventBus.js';

/**
 * TuneModified Custom Event
 */
export class TuneModifiedEvent<T = unknown> extends BaseDocumentEvent<EventAction.Modified, ModifiedEventData<T>> {
  /**
   * TuneModifiedEvent class constructor
   * @param index - index of the modified tune in the document
   * @param data - event data with new and previous values
   * @param userId - user identifier
   */
  constructor(index: Index, data: ModifiedEventData<T>, userId: string | number) {
    super(index, EventAction.Modified, data, userId);
  }
}
