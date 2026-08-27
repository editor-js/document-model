import type { EventAction } from './EventAction.js';
import { EventType } from './EventType.js';
import type { IndexBase } from './Index/IndexBase.js';
import type { PartialIndex } from './Index/PartialIndex.js';
import type { ModifiedEventData } from './EventBus.js';

export type { ModifiedEventData };

/**
 * Common fields for all events related to the document model
 */
export interface EventPayloadBase<Action extends EventAction, Data = unknown, I extends IndexBase = IndexBase> {
  /**
   * The index of changed information
   */
  index: I;

  /**
   * The action that was performed on the information
   */
  action: Action;

  /**
   * The data of the changed information
   */
  data: Data;

  /**
   * User identifier
   */
  userId: number | string;
}

/**
 * BaseDocumentEvent Custom Event
 */
export class BaseDocumentEvent<Action extends EventAction, Data = unknown, I extends IndexBase = IndexBase> extends CustomEvent<EventPayloadBase<Action, Data, I>> {
  /**
   * BaseDocumentEvent class constructor
   * @param index - index of the modified value in the document
   * @param action - the action that was performed
   * @param data - payload describing the change
   * @param userId - user identifier
   */
  constructor(index: I | PartialIndex, action: Action, data: Data, userId: string | number) {
    super(EventType.Changed, {
      detail: {
        index: index as I,
        action,
        data,
        userId,
      },
    });
  }
}
