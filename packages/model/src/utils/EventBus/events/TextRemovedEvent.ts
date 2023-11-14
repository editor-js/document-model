import type { EventPayloadBase } from '../types/EventPayloadBase';
import { EventAction } from '../types/EventAction.js';
import { EventType } from '../types/EventType.js';
import type { TextNodeInDocumentIndex, TextNodeInBlockIndex, TextRangeIndex } from '../types/indexing';

type Index = TextRangeIndex | TextNodeInBlockIndex | TextNodeInDocumentIndex;


interface TextRemovedEventPayload extends EventPayloadBase<Index, EventAction.Removed> {
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
  constructor(index: Index, text: string) {
    super(EventType.Changed, {
      detail: {
        action: EventAction.Removed,
        index,
        data: text,
      },
    });
  }
}
