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
   * @param userId - user identifier
   */
  constructor(payload: CaretSerialized, userId?: string | number) {
    // Stryker disable next-line ObjectLiteral
    super(EventType.CaretManagerUpdated, {
      detail: {
        ...payload,
        userId,
      },
    });
  }
}
