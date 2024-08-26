import type { Index } from '../../entities/index.js';
import type { EventAction } from './EventAction.js';

/**
 * Common fields for all events related to the document model
 */
export interface EventPayloadBase<Action extends EventAction> {
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
  data: unknown;
}

/**
 * Base data interface for Modified event with new and previous values
 */
export interface ModifiedEventData<T = unknown> {
  value: T;
  previous: T;
}
