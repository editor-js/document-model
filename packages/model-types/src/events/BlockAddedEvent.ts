import { EventAction } from '../EventAction.js';
import { BaseDocumentEvent } from '../BaseDocumentEvent.js';
import type { Index } from '../Index/index.js';
import type { BlockNodeSerialized } from '../BlockNode.js';

/**
 * BlockAdded Custom Event
 */
export class BlockAddedEvent extends BaseDocumentEvent<EventAction.Added, BlockNodeSerialized> {
  /**
   * BlockAddedEvent class constructor
   * @param index - index of the added BlockNode in the document
   * @param data - BlockNode serialized data
   * @param userId - user identifier
   */
  constructor(index: Index, data: BlockNodeSerialized, userId: string | number) {
    super(index, EventAction.Added, data, userId);
  }
}
