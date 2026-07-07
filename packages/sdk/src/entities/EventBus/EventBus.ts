import type { Event } from './Event.js';
import { EventBus } from '@editorjs/model-types';

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
    addEventListener(type: Event, callback: ((event: CustomEvent) => void) | null, options?: AddEventListenerOptions | boolean): void;

    /**
     * Removes an event listener for the specified event type
     * @param type - a string representing the event type to stop listening for
     * @param callback - the event callback to remove
     * @param options - an options object that specifies characteristics about the event listener
     */
    removeEventListener(type: Event, callback: ((event: CustomEvent) => void) | null, options?: EventListenerOptions | boolean): void;
  }
}

export { EventBus };
