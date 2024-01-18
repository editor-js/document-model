import { EventAction } from '../types/EventAction.js';
import type { TextIndex } from '../types/indexing.js';
import { BaseDocumentEvent } from './BaseEvent.js';


/**
 * TextRemoved Custom Event
 */
export class TextRemovedEvent extends BaseDocumentEvent<TextIndex, EventAction.Removed, string> {
  /**
   * TextRemovedEvent class constructor
   *
   * @param index - index of the removed text in the document
   * @param text - removed text
   */
  constructor(index: TextIndex, text: string) {
    super(index, EventAction.Removed, text);
  }
}
