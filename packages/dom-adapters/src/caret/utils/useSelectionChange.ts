import { createSingleton } from './singleton.js';

/**
 * Singleton that watches for document "selection change" event and delegates the provided callbacks to subscribers.
 */
export interface Subscriber {
  /**
   * Callback that will be called on "selection change" event.
   *
   * @param selection - current document selection
   */
  (selection: Selection | null): void;
}

/**
 * Utility composable that watches for document "selection change" event and delegates the provided callbacks to subscribers.
 */
export const useSelectionChange = createSingleton(() => {
  const subscribers = new Set<Subscriber>();

  document.addEventListener('selectionchange', () => {
    const selection = document.getSelection();

    subscribers.forEach((callback) => {
      callback(selection);
    });
  });

  /**
   * Subscribe on "selection change" event.
   *
   * @param callback - callback that will be called on "selection change" event
   */
  function on(callback: Subscriber): void {
    subscribers.add(callback);
  }

  /**
   * Unsubscribe from "selection change" event.
   *
   * @param callback - callback that was passed to "on" method
   */
  function off(callback: Subscriber): void {
    subscribers.delete(callback);
  }

  return {
    on,
    off,
  };
});