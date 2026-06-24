import { AdapterEventType } from './AdapterEventType.js';

/**
 * Payload of the TuneDataChanged event
 */
export interface TuneDataChangedPayload {
  /**
   * Data key whose value changed
   */
  key: string;

  /**
   * New value
   */
  value: unknown;

  /**
   * Previous value
   */
  previous: unknown;
}

/**
 * TuneDataChangedEvent adapter event, dispatched when tune data is modified in the model
 */
export class TuneDataChangedEvent extends CustomEvent<TuneDataChangedPayload> {
  /**
   * Creates a tune data change event for the given key
   * @param key - which data field changed
   * @param value - new value
   * @param previous - value before the change
   */
  constructor(key: string, value: unknown, previous: unknown) {
    super(AdapterEventType.TuneUpdated, {
      detail: { key,
        value,
        previous },
    });
  }
}
