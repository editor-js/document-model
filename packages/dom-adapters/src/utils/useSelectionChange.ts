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
   * Subscriber of each watched input, in subscription order
   */
  const subscribers = new Map<InputWithCaret, Subscriber>();

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
     * Each subscriber gets the selection while it is inside its input, and null otherwise,
     * so an input the selection has moved away from learns it lost it
     */
    subscribers.forEach((subscriber, input) => {
      subscriber.callback.call(subscriber.context, isSelectionRelatedToInput(selection, input) ? selection : null);
    });
  }

  /**
   * Controls the single document listener; null while no input is subscribed
   */
  let documentListener: AbortController | null = null;

  /**
   * Registers the document listener, unless it is already registered: editors on the page share it
   */
  function listen(): void {
    if (documentListener !== null) {
      return;
    }

    documentListener = new AbortController();

    /**
     * We use single for document "selection change" event and delegate the provided callbacks to subscribers.
     */
    document.addEventListener('selectionchange', onDocumentSelectionChanged, { signal: documentListener.signal });
  }

  /**
   * Releases the shared document listener
   */
  function stopListening(): void {
    documentListener?.abort();
    documentListener = null;
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

    subscribers.set(input, {
      callback,
      context,
    });

    listen();
  }

  /**
   * Unsubscribe from "selection change" event.
   * @param input - input to remove subscription
   */
  function off(input: InputWithCaret): void {
    subscribers.delete(input);

    /**
     * Editors on the page share the document listener, so it is removed with the last subscriber only
     */
    if (subscribers.size === 0) {
      stopListening();
    }
  }

  /**
   * Destroy document selection change watcher: unsubscribes every input, which removes the document listener
   */
  function destroy(): void {
    [...subscribers.keys()].forEach(input => off(input));
  }

  return {
    on,
    off,
    destroy,
  };
});
