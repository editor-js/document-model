import { Operation, OperationType } from './Operation.js';

/**
 * Utility class to transform operations
 */
export class Transformer {
  /**
   * Makes an inverse operation
   *
   * @param operation - operation to inverse
   */
  public static inverse(operation: Operation): Operation {
    switch (operation.type) {
      case OperationType.Insert:
        return new Operation(OperationType.Delete, operation.index, {
          prevValue: operation.data.newValue,
          newValue: operation.data.prevValue,
        });
      case OperationType.Delete:
        return new Operation(OperationType.Insert, operation.index, {
          prevValue: operation.data.newValue,
          newValue: operation.data.prevValue,
        });
      case OperationType.Modify:
        return new Operation(OperationType.Modify, operation.index, {
          prevValue: operation.data.newValue,
          newValue: operation.data.prevValue,
        });
      default:
        throw new Error('Unknown operation type');
    }
  }
}
