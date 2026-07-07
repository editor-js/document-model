import { EventType } from '../EventType.js';
import type { CaretSerialized } from './CaretManagerCaretUpdatedEvent.js';

/**
 * CaretManagerCaretAdded Custom Event
 */
export class CaretManagerCaretAddedEvent extends CustomEvent<CaretSerialized> {
  /**
   * CaretManagerCaretAddedEvent class constructor
   * @param payload - serialized caret data for the newly added caret
   */
  constructor(payload: CaretSerialized) {
    super(EventType.CaretManagerUpdated, {
      detail: payload,
    });
  }
}
