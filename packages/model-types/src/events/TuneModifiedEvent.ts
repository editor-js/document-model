import { EventAction } from '../EventAction.js';
import { BaseDocumentEvent } from '../BaseDocumentEvent.js';
import type { TuneIndex } from '../Index/TuneIndex.js';
import type { PartialIndex } from '../Index/PartialIndex.js';
import type { ModifiedEventData } from '../EventBus.js';

/**
 * TuneModified Custom Event
 */
export class TuneModifiedEvent<T = unknown> extends BaseDocumentEvent<EventAction.Modified, ModifiedEventData<T>, TuneIndex> {
  /**
   * TuneModifiedEvent class constructor
   * @param index - index of the modified tune in the document
   * @param data - event data with new and previous values
   * @param userId - user identifier
   */
  constructor(index: TuneIndex | PartialIndex, data: ModifiedEventData<T>, userId: string | number) {
    super(index, EventAction.Modified, data, userId);
  }
}
