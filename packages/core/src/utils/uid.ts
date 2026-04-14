/**
 * Generates unique UUID
 */
export function generateId(): string {
  return crypto.randomUUID();
}
