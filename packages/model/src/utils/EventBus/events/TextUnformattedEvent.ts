import type { EventPayloadBase } from '../types/EventPayloadBase';
import { EventAction } from '../types/EventAction.js';
import { EventType } from '../types/EventType.js';
import type { InlineToolData, InlineToolName } from '../../../entities';
import type { TextNodeInDocumentIndex, TextNodeInBlockIndex, TextRangeIndex } from '../types/indexing';

type Index = TextRangeIndex | TextNodeInBlockIndex | TextNodeInDocumentIndex;

interface TextUnformattedEventPayload extends EventPayloadBase<Index, EventAction.Removed> {
  data: {
    tool: InlineToolName,
    data?: InlineToolData,
  };
}

/**
 *
 */
export class TextUnformattedEvent extends CustomEvent<TextUnformattedEventPayload> {
  /**
   *
   * @param index
   * @param tool
   * @param data
   */
  constructor(index: Index, tool: InlineToolName, data?: InlineToolData) {
    const eventData: TextUnformattedEventPayload['data'] = {
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
