import { EventAction } from '../EventAction.js';
import { BaseDocumentEvent } from '../BaseDocumentEvent.js';
import type { BlockIndex } from '../Index/BlockIndex.js';
import type { PartialIndex } from '../Index/PartialIndex.js';
import type { BlockNodeSerialized } from '../BlockNode.js';

/**
 * BlockRemoved Custom Event
 */
export class BlockRemovedEvent extends BaseDocumentEvent<EventAction.Removed, BlockNodeSerialized, BlockIndex> {
  /**
   * BlockRemovedEvent class constructor
   * @param index - index of the removed BlockNode in the document
   * @param data - BlockNode serialized data
   * @param userId - user identifier
   */
  constructor(index: BlockIndex | PartialIndex, data: BlockNodeSerialized, userId: string | number) {
    super(index, EventAction.Removed, data, userId);
  }
}
