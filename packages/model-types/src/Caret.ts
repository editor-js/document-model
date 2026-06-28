import type { Index } from './Index/index.js';

/**
 * Caret is responsible for storing caret index
 */
export interface Caret {
  /** Caret index */
  readonly index: Index | null;

  /** User identifier */
  readonly userId: string | number;

  /** Updates caret index */
  update(index: Index | null): void;
}
