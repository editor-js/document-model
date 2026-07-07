import type { EventAction } from './EventAction.js';
import { EventType } from './EventType.js';
import type { Index } from './Index/index.js';
import type { ModifiedEventData } from './EventBus.js';

export type { ModifiedEventData };

/**
 * Common fields for all events related to the document model
 */
export interface EventPayloadBase<Action extends EventAction, Data = unknown> {
  /**
   * The index of changed information
   */
  index: Index;

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
export class BaseDocumentEvent<Action extends EventAction, Data = unknown> extends CustomEvent<EventPayloadBase<Action, Data>> {
  /**
   * BaseDocumentEvent class constructor
   * @param index - index of the modified value in the document
   * @param action - the action that was performed
   * @param data - payload describing the change
   * @param userId - user identifier
   */
  constructor(index: Index, action: Action, data: Data, userId: string | number) {
    super(EventType.Changed, {
      detail: {
        index,
        action,
        data,
        userId,
      },
    });
  }
}
