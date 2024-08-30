import 'reflect-metadata';
import { Service } from 'typedi';

export type Event<Channel extends string = string, Name extends string = string> = `${Channel}:${Name}`;

export type CoreEvent<Name extends string = string> = Event<'core', Name>;

/**
 * Extension for the EventTarget interface to allow for custom events.
 */
declare global {
  /**
   * EventTarget interface extension
   */
  interface EventTarget {
    /**
     * Adds an event listener for the specified event type
     * @param type - a string representing the event type to listen for
     * @param callback - the function to call when the event is triggered
     * @param options - an options object that specifies characteristics about the event listener
     */
    // eslint-disable-next-line n/no-unsupported-features/node-builtins
    addEventListener(type: Event, callback: ((event: CustomEvent) => void) | null, options?: AddEventListenerOptions | boolean): void;
    /**
     * Removes an event listener for the specified event type
     * @param type - a string representing the event type to stop listening for
     * @param callback - the event callback to remove
     * @param options - an options object that specifies characteristics about the event listener
     */
    // eslint-disable-next-line n/no-unsupported-features/node-builtins
    removeEventListener(type: Event, callback: ((event: CustomEvent) => void) | null, options?: EventListenerOptions | boolean): void;
  }
}

/**
 * EventBus class to handle events between components
 * Extends native EventTarget class
 */
@Service()
export class EventBus extends EventTarget {}

export * from './core-events/index.js';
export * from './ui-events/index.js';
