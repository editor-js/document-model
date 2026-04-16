import { UIEventBase } from '@editorjs/sdk';

/**
 * Base event class for Toolbox events
 */
export class ToolboxBaseEvent<Payload = unknown> extends UIEventBase<Payload> {
  /**
   * Constructor function
   * @param name - name of a Toolbox event
   * @param payload - generic payload
   */
  constructor(name: string, payload: Payload) {
    super(`toolbox:${name}`, payload);
  }
}
