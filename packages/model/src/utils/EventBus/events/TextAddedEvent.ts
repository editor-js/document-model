import type { TextNodeInDocumentIndex, TextNodeInBlockIndex, TextRangeIndex, TextStartIndex } from '../types/indexing';
import type { EventPayloadBase } from '../types/EventPayloadBase';
import { EventAction } from '../types/EventAction.js';
import { EventType } from '../types/EventType.js';

type Index = TextRangeIndex | TextNodeInBlockIndex | TextNodeInDocumentIndex;

interface TextAddedEventPayload extends EventPayloadBase<Index, EventAction.Added> {
  data: string;
}

/**
 *
 */
export class TextAddedEvent extends CustomEvent<TextAddedEventPayload> {
  /**
   *
   * @param index
   * @param text
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
