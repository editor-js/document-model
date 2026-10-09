import { createSingleton } from './singleton.js';

/**
 * Singleton that watches for document "selection change" event and delegates the provided callbacks to subscribers.
 */
export interface Subscriber {
  /**
   * Callback that will be called on "selection change" event.
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
 * @todo add support for native inputs
 */
export type InputWithCaret = HTMLElement;

/**
 * Utility composable that watches for document "selection change" event and delegates the provided callbacks to subscribers.
 */
export const useSelectionChange = createSingleton(() => {
  /**
   * Stores the last input that was related to the selection.
   * We need that to send update when selection is moved to another input.
   */
  let lastRelatedInput: HTMLElement | null = null;

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
   * @param e - selection change event
   */
  function onDocumentSelectionChanged(e: Event): void {
    /**
     * Selection changes in the HTMLInputElement bubbles up.
     * We don't support native inputs within the Editor document,
     * so just ignore those events to avoid unnecessary processing.
     */
    if (!(e.target instanceof Document)) {
      return;
    }

    const selection = document.getSelection();

    /**
     * Iterate over all subscribers WeakMap and call their callbacks.
     */
    inputsWatched.forEach((input) => {
      const subscriber = subscribers.get(input);

      let isRelatedInputFound = false;

      if (subscriber && isSelectionRelatedToInput(selection, input)) {
        lastRelatedInput = input;
        isRelatedInputFound = true;

        subscriber.callback.call(subscriber.context, selection);
      }

      /**
       * If no related input found or input is changed, we need to notify subscriber selection is out of it's input
       */
      if (!isRelatedInputFound || input !== lastRelatedInput) {
        subscriber?.callback.call(subscriber.context, null);
      }

      /**
       * If no related input found, we need to reset last related input
       */
      if (!isRelatedInputFound) {
        lastRelatedInput = null;
      }
    });
  }

  /**
   * Subscribe on "selection change" event.
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
     * The document listener is shared, so it is added with the first subscriber only
     */
    if (inputsWatched.length === 1) {
      document.addEventListener('selectionchange', onDocumentSelectionChanged);
    }

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
   * @param input - input to remove subscription
   */
  function off(input: InputWithCaret): void {
    if (!subscribers.has(input)) {
      return;
    }

    subscribers.delete(input);
    inputsWatched.splice(inputsWatched.indexOf(input), 1);

    /**
     * Editors on the page share the document listener, so it is removed with the last subscriber only
     */
    if (inputsWatched.length === 0) {
      document.removeEventListener('selectionchange', onDocumentSelectionChanged);
    }
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
   * Destroy document selection change watcher: unsubscribes every input, which removes the document listener
   */
  function destroy(): void {
    [...inputsWatched].forEach(input => off(input));
  }

  return {
    on,
    off,
    init,
    destroy,
  };
});
