import { DocumentModelEventMap } from './DocumentModelEventMap';

/**
 * Augment EventTarget's addEventListener method to accept CustomEvent
 */
declare global {
  interface EventTarget {
    addEventListener<T extends keyof DocumentModelEventMap>(type: T, listener: (event: DocumentModelEventMap[T]) => void): void;
  }
}
