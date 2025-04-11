import type { BlockNodeDataSerializedValue } from '../../entities/BlockNode/types/index.js';
import type { Index } from '../../entities/Index/index.js';
import { EventAction } from '../types/EventAction.js';
import { BaseDocumentEvent } from './BaseEvent.js';


/**
 * DataNodeAdded Custom Event
 */
export class DataNodeAddedEvent extends BaseDocumentEvent<EventAction.Added,  BlockNodeDataSerializedValue> {
  /**
   * DataNodeAdded class constructor
   *
   * @param index - index of the added BlockNode in the document
   * @param data - data serialized value
   * @param userId - user identifier
   */
  constructor(index: Index, data: BlockNodeDataSerializedValue, userId: string | number) {
    // Stryker disable next-line ObjectLiteral
    super(index, EventAction.Added, data, userId);
  }
}
