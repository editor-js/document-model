import type { TextNodeInDocumentIndex, TextNodeInBlockIndex, TextRangeIndex } from '../types/indexing';
import type { EventPayloadBase } from '../types/EventPayloadBase';
import { EventAction } from '../types/EventAction.js';
import { EventType } from '../types/EventType.js';

type Index = TextRangeIndex | TextNodeInBlockIndex | TextNodeInDocumentIndex;

interface TextAddedEventPayload extends EventPayloadBase<Index, EventAction.Added> {
  data: string;
}

/**
 * TextAdded Custom Event
 */
export class TextAddedEvent extends CustomEvent<TextAddedEventPayload> {
  /**
   * TextAddedEvent class constructor
   *
   * @param index - index of the added text in the document
   * @param text - added text
   */
  constructor(index: Index, text: string) {
    super(EventType.Changed, {
      detail: {
        action: EventAction.Added,
        index,
        data: text,
      },
    });
  }
}
