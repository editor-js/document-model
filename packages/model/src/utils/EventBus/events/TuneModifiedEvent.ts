import type { EventPayloadBase, ModifiedEventData } from '../types/EventPayloadBase';
import type { TuneInDocumentIndex, TuneInBlockIndex, TuneIndex } from '../types/indexing';
import { EventAction } from '../types/EventAction.js';
import { EventType } from '../types/EventType.js';

type Index = TuneIndex | TuneInBlockIndex | TuneInDocumentIndex;

interface TuneModifiedEventPayload<T = unknown> extends EventPayloadBase<Index, EventAction.Modified> {
  data: ModifiedEventData<T>;
}

/**
 * TuneModified Custom Event
 */
export class TuneModifiedEvent<T = unknown> extends CustomEvent<TuneModifiedEventPayload<T>> {
  /**
   * TuneModifiedEvent class constructor
   *
   * @param index - index of the modified tune in the document
   * @param data - event data with new and previous values
   */
  constructor(index: Index, data: ModifiedEventData<T>) {
    super(EventType.Changed, {
      detail: {
        action: EventAction.Modified,
        index,
        data,
      },
    });
  }
}
