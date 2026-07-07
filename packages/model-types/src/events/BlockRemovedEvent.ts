import { EventAction } from '../EventAction.js';
import { BaseDocumentEvent } from '../BaseDocumentEvent.js';
import type { Index } from '../Index/index.js';
import type { BlockNodeSerialized } from '../BlockNode.js';

/**
 * BlockRemoved Custom Event
 */
export class BlockRemovedEvent extends BaseDocumentEvent<EventAction.Removed, BlockNodeSerialized> {
  /**
   * BlockRemovedEvent class constructor
   * @param index - index of the removed BlockNode in the document
   * @param data - BlockNode serialized data
   * @param userId - user identifier
   */
  constructor(index: Index, data: BlockNodeSerialized, userId: string | number) {
    super(index, EventAction.Removed, data, userId);
  }
}
