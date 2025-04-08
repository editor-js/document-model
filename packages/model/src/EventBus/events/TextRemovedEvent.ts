import type { Index } from '../../entities/Index/index.js';
import { EventAction } from '../types/EventAction.js';
import { BaseDocumentEvent } from './BaseEvent.js';


/**
 * TextRemoved Custom Event
 */
export class TextRemovedEvent extends BaseDocumentEvent<EventAction.Removed, string> {
  /**
   * TextRemovedEvent class constructor
   *
   * @param index - index of the removed text in the document
   * @param text - removed text
   * @param userId - user identifier
   */
  constructor(index: Index, text: string, userId?: string | number) {
    super(index, EventAction.Removed, text, userId);
  }
}
