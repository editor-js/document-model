import type { DataIndex, StartIndex } from '../types/indexing';
import type { EventPayloadBase } from '../types/EventPayloadBase';
import { EventAction } from '../types/EventAction.js';
import { EventType } from '../types/EventType.js';

interface TextRemovedEventPayload extends EventPayloadBase<StartIndex | DataIndex, EventAction.Removed> {
  data: string;
}

/**
 *
 */
export class TextRemovedEvent extends CustomEvent<TextRemovedEventPayload> {
  /**
   *
   * @param index
   * @param text
   */
  constructor(index: StartIndex | DataIndex, text: string) {
    super(EventType.Changed, {
      detail: {
        action: EventAction.Removed,
        index,
        data: text,
      },
    });
  }
}
