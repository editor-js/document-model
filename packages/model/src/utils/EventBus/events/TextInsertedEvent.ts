import type { DataIndex, StartIndex } from '../types/indexing';
import type { EventPayloadBase } from '../types/EventPayloadBase';
import { EventAction } from '../types/EventAction.js';
import { EventType } from '../types/EventType.js';

interface TextInsertedEventPayload extends EventPayloadBase<DataIndex | StartIndex, EventAction.Added> {
  data: string;
}

/**
 *
 */
export class TextInsertedEvent extends CustomEvent<TextInsertedEventPayload> {
  /**
   *
   * @param index
   * @param text
   */
  constructor(index: StartIndex | DataIndex, text: string) {
    super(EventType.Changed, {
      detail: {
        action: EventAction.Added,
        index,
        data: text,
      },
    });
  }
}
