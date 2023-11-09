import EventEmitter from 'eventemitter3';

/**
 * Provides an event bus for using in the document model
 */
export class EventBus {
  /**
   * The event emitter instance
   */
  #instance: EventEmitter;

  /**
   * Creates an instance of EventBus
   */
  constructor() {
    this.#instance = new EventEmitter();
  }

  /**
   * Registers an event listener
   *
   * @param event - The event name
   * @param listener - The event listener
   * @param [context] - The context to bind the listener to
   */
  public on(event: string, listener: (...args: any[]) => void, context?: any): void {
    this.#instance.on(event, listener, context);
  }

  /**
   * Registers an event listener that is called only once
   *
   * @param event - The event name
   * @param listener - The event listener
   * @param [context] - The context to bind the listener to
   */
  public once(event: string, listener: (...args: any[]) => void, context?: any): void {
    this.#instance.once(event, listener, context);
  }

  /**
   * Removes an event listener
   *
   * @param event - The event name
   * @param listener - The event listener
   * @param [context] - The context the listener was bound to
   * @param [once] - Whether the listener was registered as a one-time listener
   */
  public off(event: string, listener: (...args: any[]) => void, context?: any, once?: boolean): void {
    this.#instance.off(event, listener, context, once);
  }

  /**
   * Emits an event
   *
   * @param event - The event name
   * @param {...any} args - The event arguments
   */
  public emit(event: string, ...args: any[]): void {
    this.#instance.emit(event, ...args);
  }
}
