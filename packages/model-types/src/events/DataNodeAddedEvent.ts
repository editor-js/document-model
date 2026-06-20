import type { BlockNodeDataSerializedValue } from '../BlockNode.js';
import type { Index } from '../Index/index.js';
import { EventAction } from '../EventAction.js';
import { BaseDocumentEvent } from '../BaseDocumentEvent.js';

/**
 * DataNodeAdded Custom Event
 */
export class DataNodeAddedEvent extends BaseDocumentEvent<EventAction.Added, BlockNodeDataSerializedValue> {
  /**
   * DataNodeAdded class constructor
   * @param index - index of the added BlockNode in the document
   * @param data - data serialized value
   * @param userId - user identifier
   */
  constructor(index: Index, data: BlockNodeDataSerializedValue, userId: string | number) {
    super(index, EventAction.Added, data, userId);
  }
}
