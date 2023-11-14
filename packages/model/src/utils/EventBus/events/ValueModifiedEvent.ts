import type { EventPayloadBase, ModifiedEventData } from '../types/EventPayloadBase';
import { EventAction } from '../types/EventAction.js';
import type { ValueNodeInDocumentIndex, ValueIndex, ValueNodeInBlockIndex } from '../types/indexing';
import { EventType } from '../types/EventType.js';

type Index = ValueIndex | ValueNodeInBlockIndex | ValueNodeInDocumentIndex;

interface ValueModifiedEventPayload<V = unknown> extends EventPayloadBase<Index, EventAction.Modified> {
  data: ModifiedEventData<V>;
}

/**
 *
 */
export class ValueModifiedEvent<V = unknown> extends CustomEvent<ValueModifiedEventPayload<V>> {
  /**
   *
   * @param index
   * @param value
   * @param previous
   */
  constructor(index: Index, value: V, previous: V) {
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
