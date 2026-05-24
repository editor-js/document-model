import { AdapterEventType } from './AdapterEventType.js';

/**
 * Payload of the KeyAdded event
 */
interface KeyAddedPayload {
  /**
   * Added key
   */
  key: string;
}

/**
 * KeyAddedEvent custom event
 */
export class KeyAddedEvent extends CustomEvent<KeyAddedPayload> {
  /**
   * Constructor function
   * @param key - key of the added data node
   */
  constructor(key: string) {
    super(AdapterEventType.Updated, {
      detail: {
        key,
      },
    });
  }
}
