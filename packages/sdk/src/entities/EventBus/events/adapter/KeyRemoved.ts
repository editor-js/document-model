import { AdapterEventType } from './AdapterEventType.js';

/**
 * Payload of the KeyRemoved event
 */
interface KeyRemovedPayload {
  /**
   * Removed key
   */
  key: string;
}

/**
 * KeyRemovedEvent adapter event
 */
export class KeyRemovedEvent extends CustomEvent<KeyRemovedPayload> {
  /**
   * Cosntructor function
   * @param key - key of the removed data node
   */
  constructor(key: string) {
    super(AdapterEventType.Updated, {
      detail: {
        key,
      },
    });
  }
}
