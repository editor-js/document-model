import type { DataKey } from '../types/index.js';

/**
 *
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
