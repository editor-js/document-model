import type { EventPayloadBase, ModifiedEventData } from '../types/EventPayloadBase';
import type { TuneIndex } from '../types/indexing';
import { EventAction } from '../types/EventAction.js';
import { EventType } from '../types/EventType.js';

interface TuneUpdatedEventPayload<T = unknown> extends EventPayloadBase<'' | TuneIndex, EventAction.Modified> {
  data: ModifiedEventData<T>;
}

/**
 *
 */
export class TuneUpdatedEvent<T = unknown> extends CustomEvent<TuneUpdatedEventPayload<T>> {
  /**
   *
   * @param index
   * @param value
   * @param previous
   */
  constructor(index: '' | TuneIndex, value: T, previous: T) {
    super(EventType.Changed, {
      detail: {
        action: EventAction.Modified,
        index,
        data: {
          value,
          previous,
        },
      },
    });
  }
}
