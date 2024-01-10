import type { BlockNodeSerialized } from '../../entities/BlockNode/types/index.js';
import { EventAction } from '../types/EventAction.js';
import type { BlockIndex } from '../types/indexing.js';
import { BaseDocumentEvent } from './BaseEvent.js';


/**
 * BlockAdded Custom Event
 */
export class BlockAddedEvent extends BaseDocumentEvent<BlockIndex, EventAction.Added, BlockNodeSerialized> {
  /**
   * BlockAddedEvent class constructor
   *
   * @param index - index of the added BlockNode in the document
   * @param data - BlockNode serialized data
   */
  constructor(index: BlockIndex, data: BlockNodeSerialized) {
    // Stryker disable next-line ObjectLiteral
    super(index, EventAction.Added, data);
  }
}
