/**
 * Injection tokens for the dom-adapters IoC container.
 * Using Symbol.for() so the same token is always equal across module instances.
 */
export const TOKENS = {
  /**
   * Configuration token
   */
  EditorConfig: Symbol.for('EditorConfig'),
} as const;

