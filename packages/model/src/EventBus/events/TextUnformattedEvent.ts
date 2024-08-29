import type { Index } from '../../entities/Index/index.js';
import { EventAction } from '../types/EventAction.js';
import type { InlineToolData, InlineToolName } from '../../entities/index.js';
import { BaseDocumentEvent } from './BaseEvent.js';

export interface TextUnformattedEventData {
  tool: InlineToolName,
  data?: InlineToolData,
}

/**
 * TextFormatted Custom Event
 */
export class TextUnformattedEvent extends BaseDocumentEvent<EventAction.Modified, TextUnformattedEventData> {
  /**
   * TextFormattedEvent class constructor
   *
   * @param index - index of formatted fragment in the document
   * @param data - data of the InlineTool that was used to format the fragment. Optional
   */
  constructor(index: Index, data: TextUnformattedEventData) {
    super(index, EventAction.Modified, data);
  }
}
