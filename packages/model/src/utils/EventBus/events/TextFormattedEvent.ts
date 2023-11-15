import type { TextIndex } from '../types/indexing';
import { EventAction } from '../types/EventAction.js';
import type { InlineToolData, InlineToolName } from '../../../entities';
import { BaseDocumentEvent } from './BaseEvent.js';

interface TextFormattedEventData {
  tool: InlineToolName,
  data?: InlineToolData,
}

/**
 * TextFormatted Custom Event
 */
export class TextFormattedEvent extends BaseDocumentEvent<TextIndex, EventAction.Modified, TextFormattedEventData> {
  /**
   * TextFormattedEvent class constructor
   *
   * @param index - index of formatted fragment in the document
   * @param data - data of the InlineTool that was used to format the fragment. Optional
   */
  constructor(index: TextIndex, data: TextFormattedEventData) {
    super(index, EventAction.Modified, data);
  }
}
