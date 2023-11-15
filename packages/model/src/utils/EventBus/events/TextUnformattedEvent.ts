import type { TextIndex } from '../types/indexing';
import { EventAction } from '../types/EventAction.js';
import type { InlineToolData, InlineToolName } from '../../../entities';
import { BaseDocumentEvent } from './BaseEvent.js';

interface TextUnformattedEventData {
  tool: InlineToolName,
  data?: InlineToolData,
}

/**
 * TextFormatted Custom Event
 */
export class TextUnformattedEvent extends BaseDocumentEvent<TextIndex, EventAction.Modified, TextUnformattedEventData> {
  /**
   * TextFormattedEvent class constructor
   *
   * @param index - index of formatted fragment in the document
   * @param data - data of the InlineTool that was used to format the fragment. Optional
   */
  constructor(index: TextIndex, data: TextUnformattedEventData) {
    super(index, EventAction.Modified, data);
  }
}
