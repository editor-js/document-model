import type { Index } from '../../entities/Index/index.js';
import { EventAction } from '../types/EventAction.js';
import type { BlockNodeSerialized } from '../../entities/BlockNode/types/index.js';
import { BaseDocumentEvent } from './BaseEvent.js';


/**
 * BlockRemoved Custom Event
 */
export class BlockRemovedEvent extends BaseDocumentEvent<EventAction.Removed, BlockNodeSerialized> {
  /**
   * BlockRemovedEvent class constructor
   *
   * @param index - index of the removed BlockNode in the document
   * @param data - removed BlockNode serialized data
   */
  constructor(index: Index, data: BlockNodeSerialized) {
    // Stryker disable next-line ObjectLiteral
    super(index, EventAction.Removed, data);
  }
}
