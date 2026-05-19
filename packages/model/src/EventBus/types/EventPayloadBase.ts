/**
 * Base data interface for Modified event with new and previous values
 */
export interface ModifiedEventData<T = unknown> {
  value: T;
  previous: T;
}
