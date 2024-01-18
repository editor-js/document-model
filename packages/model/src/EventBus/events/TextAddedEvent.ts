import type { TextIndex } from '../types/indexing.js';
import { EventAction } from '../types/EventAction.js';
import { BaseDocumentEvent } from './BaseEvent.js';


/**
 * TextAdded Custom Event
 */
export class TextAddedEvent extends BaseDocumentEvent<TextIndex, EventAction.Added, string> {
  /**
   * TextAddedEvent class constructor
   *
   * @param index - index of the added text in the document
   * @param text - added text
   */
  constructor(index: TextIndex, text: string) {
    super(index, EventAction.Added, text);
  }
}
