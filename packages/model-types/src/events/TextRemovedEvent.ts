import { EventAction } from '../EventAction.js';
import { BaseDocumentEvent } from '../BaseDocumentEvent.js';
import type { Index } from '../Index/index.js';

/**
 * TextRemoved Custom Event
 */
export class TextRemovedEvent extends BaseDocumentEvent<EventAction.Removed, string> {
  /**
   * TextRemovedEvent class constructor
   * @param index - index of the removed text in the document
   * @param text - text content that was deleted
   * @param userId - identifier of the user making the change
   */
  constructor(index: Index, text: string, userId: string | number) {
    super(index, EventAction.Removed, text, userId);
  }
}
