import type { EventPayloadBase, ModifiedEventData } from '../types/EventPayloadBase';
import { EventAction } from '../types/EventAction.js';
import type { ValueNodeInDocumentIndex, ValueIndex, ValueNodeInBlockIndex } from '../types/indexing';
import { EventType } from '../types/EventType.js';

type Index = ValueIndex | ValueNodeInBlockIndex | ValueNodeInDocumentIndex;

interface ValueModifiedEventPayload<V = unknown> extends EventPayloadBase<Index, EventAction.Modified> {
  data: ModifiedEventData<V>;
}

/**
 * ValueModified Custom Event
 */
export class ValueModifiedEvent<V = unknown> extends CustomEvent<ValueModifiedEventPayload<V>> {
  /**
   * ValueModifiedEvent class constructor
   *
   * @param index - index of the modified value in the document
   * @param data - event data with new and previous values
   */
  constructor(index: Index, data: ModifiedEventData<V>) {
    super(EventType.Changed, {
      detail: {
        action: EventAction.Modified,
        index,
        data,
      },
    });
  }
}
