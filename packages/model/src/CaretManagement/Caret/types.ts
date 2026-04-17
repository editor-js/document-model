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
  Updated = 'CaretUpdated'
}

/**
 * CaretUpdated Custom Event
 */
export class CaretUpdatedEvent extends CustomEvent<Caret> {
  /**
   * CaretUpdatedEvent class constructor
   * @param payload - Caret instance
   */
  constructor(payload: Caret) {
    /* Stryker disable next-line ObjectLiteral -- keep detail as Caret instance; mutants null detail and crash CaretManager.updateCaret (caret.userId) */
    super(CaretEvent.Updated, {
      detail: payload,
    });
  }
}
