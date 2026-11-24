import type { Page } from '@playwright/test';

/**
 * Where to count listeners: on `document` and `window`, or on a holder element and everything inside it
 */
export type ListenerScope = {
  /**
   * Count listeners on `document` and `window`
   */
  global: true;
} | {
  /**
   * Count listeners on the element matching this selector and everything inside it
   */
  holderSelector: string;
};

/**
 * What {@link trackListeners} installs on `window`
 */
interface TrackedWindow {
  /**
   * Lists active listeners on `document`/`window`, or inside the element matching `selector`
   */
  activeListeners(selector?: string): string[];
}

/**
 * Records every listener added through `EventTarget.prototype.addEventListener` and forgets it again on
 * `removeEventListener` or when its `signal` aborts, so a test can count the listeners still active.
 *
 * Must run before the page's scripts, so it is installed as an init script.
 * @param page - Playwright page to instrument, before navigating
 */
export async function trackListeners(page: Page): Promise<void> {
  await page.addInitScript(() => {
    /**
     * One active listener, keyed the way the DOM dedupes them
     */
    interface ListenerRecord {
      /**
       * Object the listener is registered on
       */
      target: EventTarget;

      /**
       * Event type
       */
      type: string;

      /**
       * Registered callback
       */
      listener: EventListenerOrEventListenerObject;

      /**
       * Whether it was registered for the capture phase
       */
      capture: boolean;
    }

    const active: ListenerRecord[] = [];
    const nativeAdd = EventTarget.prototype.addEventListener;
    const nativeRemove = EventTarget.prototype.removeEventListener;
    const isCapture = (options?: boolean | EventListenerOptions): boolean =>
      typeof options === 'boolean' ? options : options?.capture === true;
    const indexOf = (target: EventTarget, type: string, listener: EventListenerOrEventListenerObject, capture: boolean): number =>
      active.findIndex(record => record.target === target && record.type === type && record.listener === listener && record.capture === capture);

    EventTarget.prototype.addEventListener = function (type, listener, options) {
      nativeAdd.call(this, type, listener, options);

      const signal = typeof options === 'object' ? options.signal : undefined;
      const capture = isCapture(options);

      if (listener === null || signal?.aborted === true || indexOf(this, type, listener, capture) !== -1) {
        return;
      }

      const record = { target: this,
        type,
        listener,
        capture };

      active.push(record);

      signal !== undefined && nativeAdd.call(signal, 'abort', () => {
        const index = active.indexOf(record);

        index !== -1 && active.splice(index, 1);
      });
    };

    EventTarget.prototype.removeEventListener = function (type, listener, options) {
      nativeRemove.call(this, type, listener, options);

      if (listener === null) {
        return;
      }

      const index = indexOf(this, type, listener, isCapture(options));

      index !== -1 && active.splice(index, 1);
    };

    Object.assign(window, {
      activeListeners: (holderSelector?: string): string[] => {
        const holder = holderSelector === undefined ? null : document.querySelector(holderSelector);

        return active
          .filter(({ target }) => holderSelector === undefined
            ? target === document || target === window
            : target instanceof Node && holder !== null && holder.contains(target))
          .map(({ target, type }) => `${target === window ? 'window' : target === document ? 'document' : (target as Element).tagName}:${type}`)
          .sort();
      },
    });
  });
}

/**
 * Lists the listeners still active in `scope`, as `target:type` strings, sorted so lists compare stably
 * @param page - instrumented Playwright page
 * @param scope - `document`/`window`, or a holder element and its subtree
 */
export async function activeListeners(page: Page, scope: ListenerScope): Promise<string[]> {
  const holderSelector = 'holderSelector' in scope ? scope.holderSelector : undefined;

  return page.evaluate(
    selector => (window as unknown as TrackedWindow).activeListeners(selector),
    holderSelector
  );
}
