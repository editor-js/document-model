import { EventType } from '../EventType.js';
import type { CaretSerialized } from './CaretManagerCaretUpdatedEvent.js';

/**
 * CaretManagerCaretRemoved Custom Event
 */
export class CaretManagerCaretRemovedEvent extends CustomEvent<CaretSerialized> {
  /**
   * CaretManagerCaretRemovedEvent class constructor
   * @param payload - serialized caret data for the removed caret
   */
  constructor(payload: CaretSerialized) {
    super(EventType.CaretManagerUpdated, {
      detail: payload,
    });
  }
}
