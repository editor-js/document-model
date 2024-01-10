import { EventType } from '../types/EventType.js';
import type { CaretSerialized } from '../../CaretManagement/index.js';

/**
 * CaretManagerCaretAdded Custom Event
 */
export class CaretManagerCaretAddedEvent extends CustomEvent<CaretSerialized> {
  /**
   * CaretManagerCaretAddedEvent class constructor
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
