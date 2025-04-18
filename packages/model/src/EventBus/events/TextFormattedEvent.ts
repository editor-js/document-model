import type { Index } from '../../entities/Index/index.js';
import { EventAction } from '../types/EventAction.js';
import type { InlineToolData, InlineToolName } from '../../entities/index.js';
import { BaseDocumentEvent } from './BaseEvent.js';

export interface TextFormattedEventData {
  tool: InlineToolName,
  data?: InlineToolData,
}

/**
 * TextFormatted Custom Event
 */
export class TextFormattedEvent extends BaseDocumentEvent<EventAction.Modified, TextFormattedEventData> {
  /**
   * TextFormattedEvent class constructor
   *
   * @param index - index of formatted fragment in the document
   * @param data - data of the InlineTool that was used to format the fragment. Optional
   * @param userId - user identifier
   */
  constructor(index: Index, data: TextFormattedEventData, userId: string | number) {
    super(index, EventAction.Modified, data, userId);
  }
}
