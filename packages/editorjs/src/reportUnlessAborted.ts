/**
 * Handles the bundle's own ready promise so its rejection is never reported as unhandled.
 *
 * Destroying the editor before it is ready rejects `isReady` with an `AbortError`: that is expected
 * and ignored. Any other initialization error is logged, so it isn't lost when nobody awaits `isReady`.
 * Callers awaiting `isReady` still get the rejection, since this only attaches a handler.
 * @param promise - the ready promise
 */
export function reportUnlessAborted(promise: Promise<void>): void {
  promise.catch((error: unknown) => {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return;
    }

    console.error('[EditorJS] Initialization failed', error);
  });
}
