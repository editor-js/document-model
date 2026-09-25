import { EventAction } from '../EventAction.js';
import { BaseDocumentEvent } from '../BaseDocumentEvent.js';
import type { BlockIndex } from '../Index/BlockIndex.js';
import type { PartialIndex } from '../Index/PartialIndex.js';
import type { BlockNodeSerialized } from '../BlockNode.js';

/**
 * BlockAdded Custom Event
 */
export class BlockAddedEvent extends BaseDocumentEvent<EventAction.Added, BlockNodeSerialized, BlockIndex> {
  /**
   * BlockAddedEvent class constructor
   * @param index - index of the added BlockNode in the document
   * @param data - BlockNode serialized data
   * @param userId - user identifier
   */
  constructor(index: BlockIndex | PartialIndex, data: BlockNodeSerialized, userId: string | number) {
    super(index, EventAction.Added, data, userId);
  }
}
