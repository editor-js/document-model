/* eslint-disable @typescript-eslint/naming-convention */
/**
 * Injection tokens for the core IoC container.
 * Using Symbol.for() so the same token is always equal across module instances.
 */
export const TOKENS = {
  /**
   * Configuration token
   */
  EditorConfig: Symbol.for('EditorConfig'),
  /**
   * Adapter token
   */
  Adapter: Symbol.for('Adapter'),
} as const;
