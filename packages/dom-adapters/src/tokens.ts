/**
 * Injection tokens for the dom-adapters IoC container.
 * Using Symbol.for() so the same token is always equal across module instances.
 */
export const TOKENS = {
  /**
   * Configuration token
   */
  // eslint-disable-next-line @typescript-eslint/naming-convention
  EditorConfig: Symbol.for('EditorConfig'),
  /**
   * Editor API token
   */
  // eslint-disable-next-line @typescript-eslint/naming-convention
  EditorAPI: Symbol.for('EditorAPI'),
} as const;
