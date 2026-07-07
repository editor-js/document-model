import { EventType } from '../EventType.js';

/**
 * Payload broadcast when a caret moves or is removed
 */
export interface CaretSerialized {
  /**
   * Identifier of the user the caret belongs to
   */
  readonly userId: string | number;

  /**
   * Serialized caret index, or null if the caret was removed
   */
  readonly index: string | null;
}

/**
 * CaretManagerCaretUpdated Custom Event
 */
export class CaretManagerCaretUpdatedEvent extends CustomEvent<CaretSerialized> {
  /**
   * CaretManagerCaretUpdatedEvent class constructor
   * @param payload - serialized caret data
   */
  constructor(payload: CaretSerialized) {
    super(EventType.CaretManagerUpdated, {
      detail: payload,
    });
  }
}
