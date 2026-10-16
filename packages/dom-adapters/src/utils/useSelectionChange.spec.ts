import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { useSelectionChange } from './useSelectionChange.js';

/**
 * Stand-in for `document`: the watcher only registers its `selectionchange` listener on it.
 * It touches `document` lazily, on the first subscription, so assigning it after the import is enough
 */
const fakeDocument = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

Object.assign(globalThis, { document: fakeDocument });

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

  it('should not register a second document listener when init() is called while listening', () => {
    watcher.on(inputA, jest.fn(), null);

    watcher.init();

    expect(registrationSignals()).toHaveLength(1);
  });

  it('should ignore off() for an input that is not subscribed', () => {
    watcher.on(inputA, jest.fn(), null);

    watcher.off(inputB);

    expect(activeListeners()).toBe(1);

    watcher.off(inputA);

    expect(activeListeners()).toBe(0);
  });
});
