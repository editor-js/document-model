/**
 * Represents a base class for core events.
 * @template Payload - The type of the event payload.
 */
// eslint-disable-next-line n/no-unsupported-features/node-builtins
export class CoreEventBase<Payload = unknown> extends CustomEvent<Payload> {
  /**
   * CoreEventBase constructor function
   * @param name - type of the core event
   * @param payload - payload of the core event, can contain any data
   */
  constructor(name: string, payload: Payload) {
    super(`core:${name}`, {
      detail: payload,
    });
  }
}