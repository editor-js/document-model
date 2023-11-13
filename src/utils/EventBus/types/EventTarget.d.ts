import { EventMap } from './EventMap';

/**
 * Augment EventTarget's addEventListener method to accept CustomEvent
 */
declare global {
  interface EventTarget {
    addEventListener<T extends keyof EventMap>(type: T, listener: (event: EventMap[T]) => void): void;
  }
}
