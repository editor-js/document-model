import type { EventPayloadBase, ModifiedEventData } from '../types/EventPayloadBase';
import { EventAction } from '../types/EventAction.js';
import { EventType } from '../types/EventType.js';
import type { PropertyIndex } from '../types/indexing';

interface PropertyModifiedEventPayload<P = unknown> extends EventPayloadBase<PropertyIndex, EventAction.Modified> {
  data: ModifiedEventData<P>;
}

/**
 * PropertyModified Custom Event
 */
export class PropertyModifiedEvent<P = unknown> extends CustomEvent<PropertyModifiedEventPayload<P>> {
  /**
   * PropertyModifiedEvent class constructor
   *
   * @param index - index of the modified property in the document
   * @param value - new value of the property
   * @param previous - previous value of the property
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
