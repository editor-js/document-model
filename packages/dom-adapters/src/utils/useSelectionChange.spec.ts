import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { useSelectionChange } from './useSelectionChange.js';

/**
 * Stand-in for `document`: the watcher only registers its `selectionchange` listener on it.
 * It touches `document` lazily, on the first subscription, so assigning it after the import is enough
 */
const fakeDocument = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  getSelection: jest.fn<() => Selection | null>(() => null),
};

/**
 * Stand-in for the `Document` class: the watcher only handles events whose target is a Document
 */
class FakeDocumentClass {}

Object.assign(globalThis, {
  document: fakeDocument,
  // eslint-disable-next-line @typescript-eslint/naming-convention -- mirrors the global it stands in for
  Document: FakeDocumentClass,
});

/**
 * Builds a selection whose range intersects the given inputs only
 * @param inputs - inputs the selection is inside
 */
function selectionIn(...inputs: HTMLElement[]): Selection {
  return {
    rangeCount: 1,
    getRangeAt: () => ({ intersectsNode: (node: Node) => inputs.includes(node as HTMLElement) }),
  } as unknown as Selection;
}

/**
 * Sets the document selection and fires `selectionchange` through the active document listener
 * @param selection - selection the document reports
 * @param target - event target, the document by default
 */
function changeSelection(selection: Selection | null, target: unknown = new FakeDocumentClass()): void {
  fakeDocument.getSelection.mockReturnValue(selection);

  fakeDocument.addEventListener.mock.calls
    .filter(call => call[0] === 'selectionchange' && (call[2] as AddEventListenerOptions).signal?.aborted !== true)
    .forEach(call => (call[1] as (event: Event) => void)({ target } as unknown as Event));
}

/**
 * Signals passed with every `selectionchange` registration so far, oldest first
 */
function registrationSignals(): (AbortSignal | undefined)[] {
  return fakeDocument.addEventListener.mock.calls
    .filter(([type]) => type === 'selectionchange')
    .map(call => (call[2] as AddEventListenerOptions | undefined)?.signal);
}

/**
 * Number of `selectionchange` listeners still registered: those whose signal hasn't aborted
 */
function activeListeners(): number {
  return registrationSignals().filter(signal => signal?.aborted !== true).length;
}

describe('useSelectionChange', () => {
  const watcher = useSelectionChange();
  const inputA = {} as HTMLElement;
  const inputB = {} as HTMLElement;

  beforeEach(() => {
    watcher.off(inputA);
    watcher.off(inputB);
    fakeDocument.addEventListener.mockClear();
    fakeDocument.removeEventListener.mockClear();
  });

  it('should register one document listener, with a signal, when the first subscriber is added', () => {
    watcher.on(inputA, jest.fn(), null);
    watcher.on(inputB, jest.fn(), null);

    expect(registrationSignals()).toEqual([expect.any(AbortSignal)]);
    expect(activeListeners()).toBe(1);
  });

  it('should keep the document listener while a subscriber is left', () => {
    watcher.on(inputA, jest.fn(), null);
    watcher.on(inputB, jest.fn(), null);

    watcher.off(inputA);

    expect(activeListeners()).toBe(1);
  });

  it('should release the document listener when the last subscriber unsubscribes', () => {
    watcher.on(inputA, jest.fn(), null);
    watcher.on(inputB, jest.fn(), null);

    watcher.off(inputA);
    watcher.off(inputB);

    expect(activeListeners()).toBe(0);
    expect(fakeDocument.removeEventListener).not.toHaveBeenCalled();
  });

  it('should register a fresh document listener when a subscriber is added after all were removed', () => {
    watcher.on(inputA, jest.fn(), null);
    watcher.off(inputA);

    watcher.on(inputB, jest.fn(), null);

    expect(registrationSignals()).toHaveLength(2);
    expect(activeListeners()).toBe(1);
  });

  it('should unsubscribe every input and release the document listener on destroy', () => {
    watcher.on(inputA, jest.fn(), null);
    watcher.on(inputB, jest.fn(), null);

    watcher.destroy();

    expect(activeListeners()).toBe(0);

    watcher.on(inputA, jest.fn(), null);

    expect(activeListeners()).toBe(1);
  });

  it('should ignore off() for an input that is not subscribed', () => {
    watcher.on(inputA, jest.fn(), null);

    watcher.off(inputB);

    expect(activeListeners()).toBe(1);

    watcher.off(inputA);

    expect(activeListeners()).toBe(0);
  });

  it('should pass the selection to the subscriber whose input contains it, with its context', () => {
    const context = {};
    const callback = jest.fn(function (this: unknown) {
      expect(this).toBe(context);
    });
    const selection = selectionIn(inputA);

    watcher.on(inputA, callback, context);
    changeSelection(selection);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(selection);
  });

  it('should pass null to the subscribers whose inputs do not contain the selection', () => {
    const callbackA = jest.fn();
    const callbackB = jest.fn();
    const selection = selectionIn(inputA);

    watcher.on(inputA, callbackA, null);
    watcher.on(inputB, callbackB, null);
    changeSelection(selection);

    expect(callbackA).toHaveBeenCalledWith(selection);
    expect(callbackB).toHaveBeenCalledWith(null);
  });

  it('should pass null to the previous input and the selection to the new one when the selection moves', () => {
    const callbackA = jest.fn();
    const callbackB = jest.fn();

    watcher.on(inputA, callbackA, null);
    watcher.on(inputB, callbackB, null);
    changeSelection(selectionIn(inputA));
    callbackA.mockClear();
    callbackB.mockClear();

    const moved = selectionIn(inputB);

    changeSelection(moved);

    expect(callbackA).toHaveBeenCalledWith(null);
    expect(callbackB).toHaveBeenCalledWith(moved);
  });

  it('should pass null to every subscriber when there is no selection or it has no ranges', () => {
    const callback = jest.fn();

    watcher.on(inputA, callback, null);
    changeSelection(null);
    changeSelection({ rangeCount: 0 } as Selection);

    expect(callback.mock.calls).toEqual([[null], [null]]);
  });

  it('should ignore selection changes that do not come from the document', () => {
    const callback = jest.fn();

    watcher.on(inputA, callback, null);
    changeSelection(selectionIn(inputA), {});

    expect(callback).not.toHaveBeenCalled();
  });

  it('should stop notifying a subscriber once it unsubscribes', () => {
    const callbackA = jest.fn();
    const callbackB = jest.fn();

    watcher.on(inputA, callbackA, null);
    watcher.on(inputB, callbackB, null);
    watcher.off(inputA);
    changeSelection(selectionIn(inputA));

    expect(callbackA).not.toHaveBeenCalled();
    expect(callbackB).toHaveBeenCalledWith(null);
  });

  it('should throw when an input is subscribed twice', () => {
    watcher.on(inputA, jest.fn(), null);

    expect(() => watcher.on(inputA, jest.fn(), null)).toThrow('Input is already subscribed');
  });
});
