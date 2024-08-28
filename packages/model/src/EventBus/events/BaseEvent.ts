import type { Index } from '../../entities/Index/index.js';
import type { EventAction } from '../types/EventAction.js';
import { EventType } from '../types/EventType.js';

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
}

/**
 * Base data interface for Modified event with new and previous values
 */
export interface ModifiedEventData<T = unknown> {
  value: T;
  previous: T;
}

/**
 * BaseDocumentEvent Custom Event
 */
export class BaseDocumentEvent<Action extends EventAction, Data = unknown> extends CustomEvent<EventPayloadBase<Action, Data>> {
  /**
   * BaseDocumentEvent class constructor
   *
   * @param index - index of the modified value in the document
   * @param action - event action
   * @param data - event data
   */
  constructor(index: Index, action: Action, data: Data) {
    super(EventType.Changed, {
      detail: {
        index,
        action,
        data,
      },
    });
  }
}
