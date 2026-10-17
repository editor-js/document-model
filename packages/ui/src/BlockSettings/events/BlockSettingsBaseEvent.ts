import { UIEventBase } from '@editorjs/sdk';

/**
 * Base event class for BlockSettings events
 */
export class BlockSettingsBaseEvent<Payload = unknown> extends UIEventBase<Payload> {
  /**
   * Constructor function
   * @param name - name of a BlockSettings event
   * @param payload - generic payload
   */
  constructor(name: string, payload: Payload) {
    super(`block-settings:${name}`, payload);
  }
}
