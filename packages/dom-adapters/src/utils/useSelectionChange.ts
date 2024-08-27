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
  callback: (selection: Selection | null) => void;

  /**
   * Used to save context of the callback.
   */
  context: unknown;
}

/**
 * Node that contains a selection.
 *
 * Now supports only contenteditable elements.
 *
 * @todo add support for native inputs
 */
export type InputWithCaret = HTMLElement;


/**
 * Utility composable that watches for document "selection change" event and delegates the provided callbacks to subscribers.
 */
export const useSelectionChange = createSingleton(() => {
  /**
   * Used to iterate over all inputs and check if selection is related to them.
   */
  const inputsWatched: InputWithCaret[] = [];

  /**
   * WeakMap that stores subscribers for each input.
   */
  const subscribers = new WeakMap<InputWithCaret, Subscriber>();

  /**
   * Checks if selection is related to input
   *
   * @param selection - changed document selection
   * @param input - input to check
   */
  function isSelectionRelatedToInput(selection: Selection | null, input: InputWithCaret): boolean {
    if (selection === null || selection.rangeCount === 0) {
      return false;
    }

    const range = selection.getRangeAt(0);

    /**
     * @todo think of cross-block selection
     */
    return range.intersectsNode(input);
  }

  /**
   * Handler for document "selection change" event.
   */
  function onDocumentSelectionChanged(): void {
    const selection = document.getSelection();

    /**
     * Iterate over all subscribers WeakMap and call their callbacks.
     */
    inputsWatched.forEach((input) => {
      const subscriber = subscribers.get(input);

      if (subscriber && isSelectionRelatedToInput(selection, input)) {
        subscriber.callback.call(subscriber.context, selection);
      }
    });
  }

  /**
   * Subscribe on "selection change" event.
   *
   * @param input - input to watch caret change
   * @param callback - callback that will be called on "selection change" event
   * @param context - context of the callback
   */
  function on(input: InputWithCaret, callback: Subscriber['callback'], context: Subscriber['context']): void {
    if (subscribers.has(input)) {
      throw new Error('Input is already subscribed to "selection change" event.');
    }

    /**
     * Add input to the list of watched inputs.
     */
    inputsWatched.push(input);

    /**
     * Store subscription
     */
    subscribers.set(input, {
      callback,
      context,
    });
  }

  /**
   * Unsubscribe from "selection change" event.
   *
   * @param input - input to remove subscription
   */
  function off(input: InputWithCaret): void {
    subscribers.delete(input);
    inputsWatched.splice(inputsWatched.indexOf(input), 1);
  }

  /**
   * Initialize document selection change watcher.
   */
  function init(): void {
    /**
     * We use single for document "selection change" event and delegate the provided callbacks to subscribers.
     */
    document.addEventListener('selectionchange', onDocumentSelectionChanged);
  }

  /**
   * Destroy document selection change watcher.
   */
  function destroy(): void {
    document.removeEventListener('selectionchange', onDocumentSelectionChanged);

    inputsWatched.forEach((input) => {
      const subscriber = subscribers.get(input);

      if (subscriber) {
        off(input);
      }
    });
  }

  init();

  return {
    on,
    off,
    init,
    destroy,
  };
});
