import type { Caret } from './Caret.js';


/**
 * Caret serialized data
 */
export interface CaretSerialized {
  /**
   * Caret id
   */
  readonly userId: string | number;

  /**
   * Caret index
   */
  readonly index: string | null;
}

/**
 * Enumeration of Caret events
 */
export enum CaretEvent {
  Updated = 'CaretUpdated',
}


/**
 * CaretUpdated Custom Event
 */
export class CaretUpdatedEvent extends CustomEvent<Caret> {
  /**
   * CaretUpdatedEvent class constructor
   *
   * @param payload - Caret instance
   */
  constructor(payload: Caret) {
    super(CaretEvent.Updated, {
      detail: payload,
    });
  }
}
