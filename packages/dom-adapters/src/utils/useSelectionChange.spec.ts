import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { useSelectionChange } from './useSelectionChange.js';

/**
 * Stand-in for `document`: the watcher only adds and removes its `selectionchange` listener on it.
 * It touches `document` lazily, on the first subscription, so assigning it after the import is enough
 */
const fakeDocument = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

Object.assign(globalThis, { document: fakeDocument });

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

  it('should add the document listener when the first subscriber is added', () => {
    watcher.on(inputA, jest.fn(), null);
    watcher.on(inputB, jest.fn(), null);

    expect(fakeDocument.addEventListener).toHaveBeenCalledTimes(1);
    expect(fakeDocument.addEventListener).toHaveBeenCalledWith('selectionchange', expect.any(Function));
  });

  it('should keep the document listener while a subscriber is left', () => {
    watcher.on(inputA, jest.fn(), null);
    watcher.on(inputB, jest.fn(), null);

    watcher.off(inputA);

    expect(fakeDocument.removeEventListener).not.toHaveBeenCalled();
  });

  it('should remove the document listener when the last subscriber unsubscribes', () => {
    watcher.on(inputA, jest.fn(), null);
    watcher.on(inputB, jest.fn(), null);

    watcher.off(inputA);
    watcher.off(inputB);

    expect(fakeDocument.removeEventListener).toHaveBeenCalledTimes(1);
    expect(fakeDocument.removeEventListener).toHaveBeenCalledWith('selectionchange', expect.any(Function));
  });

  it('should re-add the document listener when a subscriber is added after all were removed', () => {
    watcher.on(inputA, jest.fn(), null);
    watcher.off(inputA);
    fakeDocument.addEventListener.mockClear();

    watcher.on(inputB, jest.fn(), null);

    expect(fakeDocument.addEventListener).toHaveBeenCalledTimes(1);
  });

  it('should unsubscribe every input and remove the document listener on destroy', () => {
    watcher.on(inputA, jest.fn(), null);
    watcher.on(inputB, jest.fn(), null);

    watcher.destroy();
    fakeDocument.addEventListener.mockClear();
    watcher.on(inputA, jest.fn(), null);

    expect(fakeDocument.removeEventListener).toHaveBeenCalledTimes(1);
    expect(fakeDocument.addEventListener).toHaveBeenCalledTimes(1);
  });

  it('should ignore off() for an input that is not subscribed', () => {
    watcher.on(inputA, jest.fn(), null);

    watcher.off(inputB);
    watcher.off(inputA);

    expect(fakeDocument.removeEventListener).toHaveBeenCalledTimes(1);
  });
});
