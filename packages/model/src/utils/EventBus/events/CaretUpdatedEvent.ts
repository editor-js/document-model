import type { Index } from '../types/indexing';
import { EventType } from '../types/EventType.js';

interface CaretUpdatedEventPayload {
  id: number;
  index: Index | null;
}


/**
 * CaretUpdated Custom Event
 */
export class CaretUpdatedEvent extends CustomEvent<CaretUpdatedEventPayload> {
  /**
   * CaretUpdatedEvent class constructor
   *
   * @param payload - event payload
   */
  constructor(payload: CaretUpdatedEventPayload) {
    // Stryker disable next-line ObjectLiteral
    super(EventType.CaretUpdated, {
      detail: payload,
    });
  }
}
