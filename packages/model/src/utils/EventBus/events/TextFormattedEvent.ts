import type { TextRangeIndex } from '../types/indexing';
import type { EventPayloadBase } from '../types/EventPayloadBase';
import { EventAction } from '../types/EventAction.js';
import { EventType } from '../types/EventType.js';
import type { InlineToolData, InlineToolName } from '../../../entities';
import type { TextNodeInDocumentIndex, TextNodeInBlockIndex } from '../types/indexing';

type Index = TextRangeIndex | TextNodeInBlockIndex | TextNodeInDocumentIndex;


interface TextFormattedEventPayload extends EventPayloadBase<Index, EventAction.Modified> {
  data: {
    tool: InlineToolName,
    data?: InlineToolData,
  };
}

/**
 * TextFormatted Custom Event
 */
export class TextFormattedEvent extends CustomEvent<TextFormattedEventPayload> {
  /**
   * TextFormattedEvent class constructor
   *
   * @param index - index of formatted fragment in the document
   * @param data - data of the InlineTool that was used to format the fragment. Optional
   */
  constructor(index: Index, data: TextFormattedEventPayload['data']) {
    super(EventType.Changed, {
      detail: {
        action: EventAction.Modified,
        index,
        data,
      },
    });
  }
}
