import type { BlockNodeDataSerializedValue } from '../BlockNode.js';
import type { DataIndex } from '../Index/DataIndex.js';
import type { PartialIndex } from '../Index/PartialIndex.js';
import { EventAction } from '../EventAction.js';
import { BaseDocumentEvent } from '../BaseDocumentEvent.js';

/**
 * DataNodeAdded Custom Event
 */
export class DataNodeAddedEvent extends BaseDocumentEvent<EventAction.Added, BlockNodeDataSerializedValue, DataIndex> {
  /**
   * DataNodeAdded class constructor
   * @param index - index of the added BlockNode in the document
   * @param data - data serialized value
   * @param userId - user identifier
   */
  constructor(index: DataIndex | PartialIndex, data: BlockNodeDataSerializedValue, userId: string | number) {
    super(index, EventAction.Added, data, userId);
  }
}
