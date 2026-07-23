import type { BlockNodeDataSerializedValue } from '../BlockNode.js';
import type { DataIndex } from '../Index/DataIndex.js';
import type { PartialIndex } from '../Index/PartialIndex.js';
import { EventAction } from '../EventAction.js';
import { BaseDocumentEvent } from '../BaseDocumentEvent.js';

/**
 * DataNodeRemoved Custom Event
 */
export class DataNodeRemovedEvent extends BaseDocumentEvent<EventAction.Removed, BlockNodeDataSerializedValue, DataIndex> {
  /**
   * DataNodeRemoved class constructor
   * @param index - index of the added BlockNode in the document
   * @param data - data serialized value
   * @param userId - user identifier
   */
  constructor(index: DataIndex | PartialIndex, data: BlockNodeDataSerializedValue, userId: string | number) {
    super(index, EventAction.Removed, data, userId);
  }
}
