import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { reportUnlessAborted } from './reportUnlessAborted.js';

/**
 * Lets the attached handler run
 */
const flush = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0));

describe('reportUnlessAborted', () => {
  let error: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    error.mockRestore();
  });

  it('should ignore an AbortError rejection', async () => {
    reportUnlessAborted(Promise.reject(new DOMException('aborted', 'AbortError')));
    await flush();

    expect(error).not.toHaveBeenCalled();
  });

  it('should log any other rejection', async () => {
    const failure = new Error('init failed');

    reportUnlessAborted(Promise.reject(failure));
    await flush();

    expect(error).toHaveBeenCalledWith('[EditorJS] Initialization failed', failure);
  });

  it('should log a DOMException of another name', async () => {
    const failure = new DOMException('bad state', 'InvalidStateError');

    reportUnlessAborted(Promise.reject(failure));
    await flush();

    expect(error).toHaveBeenCalledWith('[EditorJS] Initialization failed', failure);
  });

  it('should not log when the promise resolves', async () => {
    reportUnlessAborted(Promise.resolve());
    await flush();

    expect(error).not.toHaveBeenCalled();
  });
});
