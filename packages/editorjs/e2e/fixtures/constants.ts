/**
 * Values the fixture is built around, shared with the specs that assert on them.
 *
 * Kept apart from `main.ts` so a spec can import one without mounting an editor, and apart from
 * `e2e/support/` so the fixture doesn't drag Playwright into the browser bundle. The fixture is
 * the source of truth: a spec asserting a value the fixture doesn't actually use is a test that
 * passes for the wrong reason.
 */

/** Placeholder the fixture configures unless `?placeholder=` overrides it. */
export const DEFAULT_PLACEHOLDER = 'Type text or press Tab';

/** Text of the single block the fixture mounts when no `?text=` param is given. */
export const DEFAULT_BLOCK_TEXT = 'Hello world';
