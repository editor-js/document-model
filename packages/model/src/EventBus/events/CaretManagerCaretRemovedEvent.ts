import { EventType } from '../types/EventType.js';
import type { CaretSerialized } from '../../CaretManagement/index.js';

/**
 * CaretManagerCaretRemoved Custom Event
 */
export class CaretManagerCaretRemovedEvent extends CustomEvent<CaretSerialized> {
  /**
   * CaretManagerCaretRemovedEvent class constructor
   *
   * @param payload - event payload
   */
  constructor(payload: CaretSerialized) {
    // Stryker disable next-line ObjectLiteral
    super(EventType.CaretManagerUpdated, {
      detail: payload,
    });
  }
}
