import type { EventPayloadBase, ModifiedEventData } from '../types/EventPayloadBase';
import { EventAction } from '../types/EventAction.js';
import type { DataIndex } from '../types/indexing';
import { EventType } from '../types/EventType.js';

interface ValueUpdatedEventPayload<V = unknown> extends EventPayloadBase<'' | DataIndex, EventAction.Modified> {
  data: ModifiedEventData<V>;
}

/**
 *
 */
export class ValueUpdatedEvent<V = unknown> extends CustomEvent<ValueUpdatedEventPayload<V>> {
  /**
   *
   * @param index
   * @param value
   * @param previous
   */
  constructor(index: '' | DataIndex, value: V, previous: V) {
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
