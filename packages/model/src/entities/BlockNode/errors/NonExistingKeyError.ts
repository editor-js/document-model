import type { DataKey } from "../types/index.js";

export class NonExistingKeyError extends Error {
  constructor(key: DataKey) {
    super(`BlockNode: data with key "${key}" does not exist`);
  }
}
