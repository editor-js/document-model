import type { ValueSerialized } from '@editorjs/model';
import { AdapterEventType } from './AdapterEventType.js';

/**
 * Payload of the ValueNodeChanged event
 */
interface ValueNodeChangedPayload<V = unknown> {
  /**
   * Changed value key
   */
  key: string;

  /**
   * New value
   */
  value: ValueSerialized<V>;
}

/**
 * ValueNodeChangedEvent adapterr event
 */
export class ValueNodeChangedEvent<V = unknown> extends CustomEvent<ValueNodeChangedPayload<V>> {
  /**
   * ValueNodeChangedEvent constructor function
   * @param key - the key of the value node that has changed
   * @param value - changed value node new value
   */
  constructor(key: string, value: ValueSerialized<V>) {
    super(AdapterEventType.Updated, {
      detail: {
        key,
        value,
      },
    });
  }
}
