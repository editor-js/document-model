import type { DataKey } from '../types/index.js';

/**
 * Error is thrown on attempt to create data with already existing key
 */
export class AlreadyExistingKeyError extends Error {
  /**
   * AlreadyExistingKeyError constructor
   * @param key - data key existing node
   */
  constructor(key: DataKey) {
    super(`BlockNode: data with key "${key}" already exists`);
  }
}
