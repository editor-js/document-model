import type { DataKey } from '../entities/index.js';

/**
 * Compose data index value
 *
 * @param key - data key
 */
export function composeDataIndex(key: DataKey): `data@${DataKey}` {
  return `data@${key}`;
}
