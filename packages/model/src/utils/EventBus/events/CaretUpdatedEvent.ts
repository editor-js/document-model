import { EventType } from '../types/EventType.js';
import type { CaretSerialized } from '../../../caret/index.js';

/**
 * CaretUpdated Custom Event
 */
export class CaretUpdatedEvent extends CustomEvent<CaretSerialized> {
  /**
   * CaretUpdatedEvent class constructor
   *
   * @param payload - event payload
   */
  constructor(payload: CaretSerialized) {
    // Stryker disable next-line ObjectLiteral
    super(EventType.CaretUpdated, {
      detail: payload,
    });
  }
}
