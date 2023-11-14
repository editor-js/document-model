import type { TextRangeIndex } from '../types/indexing';
import type { EventPayloadBase } from '../types/EventPayloadBase';
import { EventAction } from '../types/EventAction.js';
import { EventType } from '../types/EventType.js';
import type { InlineToolData, InlineToolName } from '../../../entities';
import type { TextNodeInDocumentIndex, TextNodeInBlockIndex } from '../types/indexing';

type Index = TextRangeIndex | TextNodeInBlockIndex | TextNodeInDocumentIndex;


interface TextFormattedEventPayload extends EventPayloadBase<Index, EventAction.Removed> {
  data: {
    tool: InlineToolName,
    data?: InlineToolData,
  };
}

/**
 *
 */
export class TextFormattedEvent extends CustomEvent<TextFormattedEventPayload> {
  /**
   *
   * @param index
   * @param tool
   * @param data
   */
  constructor(index: Index, tool: InlineToolName, data?: InlineToolData) {
    const eventData: TextFormattedEventPayload['data'] = {
      tool,
    };

    if (data) {
      eventData.data = data;
    }

    super(EventType.Changed, {
      detail: {
        action: EventAction.Removed,
        index,
        data: eventData,
      },
    });
  }
}
