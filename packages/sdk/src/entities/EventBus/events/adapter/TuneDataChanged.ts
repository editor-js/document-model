import { AdapterEventType } from './AdapterEventType.js';

/**
 * Payload of the TuneDataChanged event
 */
export interface TuneDataChangedPayload {
  /**
   * Changed tune data key
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
   * TuneDataChangedEvent constructor
   * @param key - the data key of the tune entry that changed
   * @param value - new value
   * @param previous - previous value
   */
  constructor(key: string, value: unknown, previous: unknown) {
    super(AdapterEventType.TuneUpdated, {
      detail: { key, value, previous },
    });
  }
}
