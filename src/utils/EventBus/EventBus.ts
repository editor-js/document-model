/* eslint-disable @typescript-eslint/no-explicit-any -- @todo replace any with event object type */

/**
 * Provides an event bus for using in the document model
 */
export class EventBus {
  /**
   * The event target instance
   */
  #instance: EventTarget;

  /**
   * Creates an instance of EventBus
   */
  constructor() {
    this.#instance = new EventTarget();
  }

  /**
   * Registers an event listener
   *
   * @param type - The event type
   * @param listener - The event listener
   */
  public on(type: string, listener: (event: Event) => void): void {
    this.#instance.addEventListener(type, listener);
  }

  /**
   * Registers an event listener that is called only once
   *
   * @param type - The event type
   * @param listener - The event listener
   */
  public once(type: string, listener: (event: Event) => void): void {
    this.#instance.addEventListener(type, listener, {
      once: true,
    });
  }

  /**
   * Removes an event listener
   *
   * @param type - The event type
   * @param listener - The event listener
   */
  public off(type: string, listener: (event: Event) => void): void {
    this.#instance.removeEventListener(type, listener);
  }

  /**
   * Emits a custom event to the event target
   *
   * @param type - The event type
   * @param payload - The event payload
   */
  public emit(type: string, payload?: Record<string, any>): void {
    const customEvent = new CustomEvent(type, {
      detail: payload,
    });

    this.#instance.dispatchEvent(customEvent);
  }
}
