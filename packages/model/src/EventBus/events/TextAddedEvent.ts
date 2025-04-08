import type { Index } from '../../entities/Index/index.js';
import { EventAction } from '../types/EventAction.js';
import { BaseDocumentEvent } from './BaseEvent.js';


/**
 * TextAdded Custom Event
 */
export class TextAddedEvent extends BaseDocumentEvent<EventAction.Added, string> {
  /**
   * TextAddedEvent class constructor
   *
   * @param index - index of the added text in the document
   * @param text - added text
   * @param userId - user identifier
   */
  constructor(index: Index, text: string, userId?: string | number) {
    super(index, EventAction.Added, text, userId);
  }
}
