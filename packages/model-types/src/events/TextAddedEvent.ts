import { EventAction } from '../EventAction.js';
import { BaseDocumentEvent } from '../BaseDocumentEvent.js';
import type { TextIndex } from '../Index/TextIndex.js';
import type { PartialIndex } from '../Index/PartialIndex.js';

/**
 * TextAdded Custom Event
 */
export class TextAddedEvent extends BaseDocumentEvent<EventAction.Added, string, TextIndex> {
  /**
   * TextAddedEvent class constructor
   * @param index - index of the added text in the document
   * @param text - text content that was inserted
   * @param userId - identifier of the user making the change
   */
  constructor(index: TextIndex | PartialIndex, text: string, userId: string | number) {
    super(index, EventAction.Added, text, userId);
  }
}
