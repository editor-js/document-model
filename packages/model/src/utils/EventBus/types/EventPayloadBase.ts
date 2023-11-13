import type { EventAction } from './EventAction';
import type { Index as IndexType } from './indexing';

/**
 * Common fields for all events related to the document model
 */
export interface EventPayloadBase<Index extends IndexType, Action extends EventAction> {
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
