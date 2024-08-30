/**
 * Represents a base class for UI events.
 * @template Payload - The type of the event payload.
 */
// eslint-disable-next-line n/no-unsupported-features/node-builtins
export class UIEventBase<Payload = unknown> extends CustomEvent<Payload> {
  /**
   * UIEventBase constructor function
   * @param name - type of the core event
   * @param payload - payload of the core event, can contain any data
   */
  constructor(name: string, payload: Payload) {
    super(`ui:${name}`, {
      detail: payload,
    });
  }
}
