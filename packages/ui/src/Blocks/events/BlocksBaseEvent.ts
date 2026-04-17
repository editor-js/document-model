import { UIEventBase } from '@editorjs/sdk';

/**
 * Base event for Blocks UI plugin
 */
export class BlocksBaseEvent<Payload = unknown> extends UIEventBase<Payload> {
  /**
   * Constructor function for BlocksBaseEvent
   * @param name - name of a Blocks event
   * @param payload - generic Blocks event payload
   */
  constructor(name: string, payload: Payload) {
    super(`blocks:${name}`, payload);
  }
}
