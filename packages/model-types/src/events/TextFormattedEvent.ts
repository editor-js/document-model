import { EventAction } from '../EventAction.js';
import { BaseDocumentEvent } from '../BaseDocumentEvent.js';
import type { TextIndex } from '../Index/TextIndex.js';
import type { PartialIndex } from '../Index/PartialIndex.js';
import type { InlineToolData, InlineToolName } from '../InlineTool.js';

/**
 * Identifies which inline tool was applied and with what options
 */
export interface TextFormattedEventData {
  /**
   * Name of the applied inline tool
   */
  tool: InlineToolName;

  /**
   * Optional data passed to the inline tool
   */
  data?: InlineToolData;
}

/**
 * TextFormatted Custom Event
 */
export class TextFormattedEvent extends BaseDocumentEvent<EventAction.Modified, TextFormattedEventData, TextIndex> {
  /**
   * TextFormattedEvent class constructor
   * @param index - index of the formatted text in the document
   * @param data - formatting tool and its data
   * @param userId - identifier of the user making the change
   */
  constructor(index: TextIndex | PartialIndex, data: TextFormattedEventData, userId: string | number) {
    super(index, EventAction.Modified, data, userId);
  }
}
