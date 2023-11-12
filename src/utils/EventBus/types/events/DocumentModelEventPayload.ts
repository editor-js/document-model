import { EventType } from '../EventType';
import { Index as IndexType } from '../indexation';

/**
 * Common fields for all events related to the document model
 */
export interface DocumentModelEventPayload<Index extends IndexType, Type extends EventType> {
  /**
   * The index of changed information
   */
  index: Index;

  /**
   * The type of event
   */
  type: Type;
}
