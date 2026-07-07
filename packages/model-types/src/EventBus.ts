/**
 * Generic event bus used across the document model
 */
export class EventBus extends EventTarget {}

/**
 * Base data interface for Modified event with new and previous values
 */
export interface ModifiedEventData<T = unknown> {
  /**
   * New value
   */
  value: T;

  /**
   * Previous value
   */
  previous: T;
}
