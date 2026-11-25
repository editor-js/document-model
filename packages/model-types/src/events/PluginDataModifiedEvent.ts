import { EventAction } from '../EventAction.js';
import { BaseDocumentEvent } from '../BaseDocumentEvent.js';
import type { PluginDataIndex } from '../Index/PluginDataIndex.js';
import type { PartialIndex } from '../Index/PartialIndex.js';
import type { ModifiedEventData } from '../EventBus.js';

/**
 * PluginDataModified Custom Event
 */
export class PluginDataModifiedEvent<T = unknown> extends BaseDocumentEvent<EventAction.Modified, ModifiedEventData<T>, PluginDataIndex> {
  /**
   * PluginDataModifiedEvent class constructor
   * @param index - index of the modified plugin data key in the document
   * @param data - event data with new and previous values
   * @param userId - user identifier
   */
  constructor(index: PluginDataIndex | PartialIndex, data: ModifiedEventData<T>, userId: string | number) {
    super(index, EventAction.Modified, data, userId);
  }
}
