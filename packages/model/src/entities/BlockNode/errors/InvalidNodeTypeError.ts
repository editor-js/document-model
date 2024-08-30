import type { DataKey } from '../types/index.js';

/**
 *
 */
export class InvalidNodeTypeError extends Error {
  /**
   * InvalidNodeTypeError constructor
   *
   * @param key - data key of the invalid node
   * @param nodeName - expected node name
   */
  constructor(key: DataKey, nodeName: string) {
    super(`BlockNode: data with key "${key}" is not a ${nodeName}`);
  }
}
