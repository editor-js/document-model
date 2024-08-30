import type { DataKey } from "../types/index.js";

export class InvalidNodeTypeError extends Error {
  constructor(key: DataKey, nodeName: string) {
    super(`BlockNode: data with key "${key}" is not a ${nodeName}`);
  }
}
