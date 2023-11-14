import type { EventPayloadBase, ModifiedEventData } from '../types/EventPayloadBase';
import { EventAction } from '../types/EventAction.js';
import { EventType } from '../types/EventType.js';
import type { PropertyIndex } from '../types/indexing';

interface PropertyUpdatedEventPayload<P = unknown> extends EventPayloadBase<PropertyIndex, EventAction.Modified> {
  data: ModifiedEventData<P>;
}

/**
 *
 */
export class PropertyUpdatedEvent<P = unknown> extends CustomEvent<PropertyUpdatedEventPayload<P>> {
  /**
   *
   * @param index
   * @param value
   * @param previous
   */
  constructor(index: PropertyIndex, value: P, previous: P) {
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
