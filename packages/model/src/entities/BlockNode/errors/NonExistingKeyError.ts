import type { DataKey } from '../types/index.js';

/**
 *
 */
export class NonExistingKeyError extends Error {
  /**
   * NonExistingKeyError constructor
   *
   * @param key - data key of the non-existing node
   */
  constructor(key: DataKey) {
    super(`BlockNode: data with key "${key}" does not exist`);
  }
}
