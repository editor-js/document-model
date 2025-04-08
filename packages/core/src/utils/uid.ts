/**
 * Generates unique UUID
 */
export function generateId(): string {
  // eslint-disable-next-line n/no-unsupported-features/node-builtins
  return crypto.randomUUID();
}
