import { IndexBuilder } from '@editorjs/model';
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
    const index = operation.index;

    switch (operation.type) {
      case OperationType.Insert:

        const textRange = index.textRange;

        if (textRange == undefined) {
          throw new Error('Unsupported index');
        }

        const [ textRangeStart ] = textRange;

        const newIndex = new IndexBuilder()
          .from(index)
          .addTextRange([textRangeStart, textRangeStart + operation.data.newValue.length])
          .build();

        return new Operation(OperationType.Delete, newIndex, {
          prevValue: operation.data.newValue,
          newValue: operation.data.prevValue,
        });
      case OperationType.Delete:
        return new Operation(OperationType.Insert, index, {
          prevValue: operation.data.newValue,
          newValue: operation.data.prevValue,
        });
      case OperationType.Modify:
        return new Operation(OperationType.Modify, index, {
          prevValue: operation.data.newValue,
          newValue: operation.data.prevValue,
        });
      default:
        throw new Error('Unknown operation type');
    }
  }
}
