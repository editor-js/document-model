import { EventAction } from '../EventAction.js';
import { BaseDocumentEvent } from '../BaseDocumentEvent.js';
import type { TextIndex } from '../Index/TextIndex.js';
import type { PartialIndex } from '../Index/PartialIndex.js';
import type { InlineToolData, InlineToolName } from '../InlineTool.js';

/**
 * Identifies which inline tool was removed and with what options
 */
export interface TextUnformattedEventData {
  /**
   * Name of the removed inline tool
   */
  tool: InlineToolName;

  /**
   * Optional data passed to the inline tool
   */
  data?: InlineToolData;
}

/**
 * TextUnformatted Custom Event
 */
export class TextUnformattedEvent extends BaseDocumentEvent<EventAction.Modified, TextUnformattedEventData, TextIndex> {
  /**
   * TextUnformattedEvent class constructor
   * @param index - index of the unformatted text in the document
   * @param data - formatting tool and its data
   * @param userId - identifier of the user making the change
   */
  constructor(index: TextIndex | PartialIndex, data: TextUnformattedEventData, userId: string | number) {
    super(index, EventAction.Modified, data, userId);
  }
}
