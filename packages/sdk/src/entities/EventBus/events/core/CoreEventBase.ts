/**
 * Represents a base class for core events.
 * @template Payload - The type of the event payload.
 */
export class CoreEventBase<Payload = unknown> extends CustomEvent<Payload> {
  /**
   * CoreEventBase constructor function
   * @param name - type of the core event
   * @param payload - payload of the core event, can contain any data
   * @param options - any additional event options
   */
  constructor(name: string, payload: Payload, options: Omit<CustomEventInit, 'detail'> = {}) {
    super(`core:${name}`, {
      detail: payload,
      ...options,
    });
  }
}
