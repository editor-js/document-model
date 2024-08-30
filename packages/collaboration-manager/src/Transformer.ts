import { Index, IndexBuilder } from '@editorjs/model';
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

  /**
   *
   * @param receivedOp
   * @param localOp
   */
  public transform(receivedOp: Operation, localOp: Operation): Operation {
    if (!receivedOp.index.isTextIndex || !localOp.index.isTextIndex) {
      throw new Error('Unsupported index');
    }

    if (receivedOp.type === OperationType.Modify || localOp.type === OperationType.Modify) {
      throw new Error('Unsupported operation type');
    }

    /**
     * Do not transform operations if they are on different blocks or documents
     */
    if (receivedOp.index.documentId !== localOp.index.documentId || receivedOp.index.blockIndex !== localOp.index.blockIndex) {
      return receivedOp;
    }

    const [ receivedStartIndex ] = receivedOp.index.textRange!;
    const [ localStartIndex ] = localOp.index.textRange!;

    switch (true) {
      case receivedOp.type === OperationType.Insert && localOp.type === OperationType.Insert:
        if (receivedStartIndex <= localStartIndex) {
          return receivedOp;
        } else {
          return this.shiftOperation(receivedOp, localOp.data.newValue.length);
        }

      case receivedOp.type === OperationType.Delete && localOp.type === OperationType.Delete:
        if (receivedStartIndex < localStartIndex) {
          return receivedOp;
        } else if (receivedStartIndex > localStartIndex) {
          return this.shiftOperation(receivedOp, -localOp.data.prevValue.length);
        } else {
          // If both delete at the same index, adjust the length of deletion
          const minLength = Math.min(receivedOp.data.prevValue.length, localOp.data.prevValue.length);

          return new Operation(OperationType.Delete, receivedOp.index, {
            prevValue: receivedOp.data.prevValue.slice(minLength),
            newValue: '',
          });
        }

      case receivedOp.type === OperationType.Insert && localOp.type === OperationType.Delete:
        if (receivedStartIndex <= localStartIndex) {
          return receivedOp;
        } else {
          return this.shiftOperation(receivedOp, -localOp.data.prevValue.length);
        }

      case receivedOp.type === OperationType.Delete && localOp.type === OperationType.Insert:
        if (receivedStartIndex < localStartIndex) {
          return receivedOp;
        } else {
          return this.shiftOperation(receivedOp, localOp.data.newValue.length);
        }

      default:
        throw new Error('Unsupported operation type');
    }
  }

  /**
   *
   * @param op
   * @param shift
   */
  private shiftOperation(op: Operation, shift: number): Operation {
    if (!op.index.isTextIndex) {
      throw new Error('Unsupported index');
    }

    const [ textRangeStart ] = op.index.textRange!;

    return new Operation(
      op.type,
      new IndexBuilder().from(op.index)
        .addTextRange([textRangeStart + shift, textRangeStart + shift])
        .build(),
      op.data
    );
  }
}
