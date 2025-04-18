import { InvertedOperationType, Operation, OperationType, type SerializedOperation } from './Operation.js';

/**
 * Class to batch Text operations (maybe others in the future) for Undo/Redo purposes
 *
 * Operations are batched on timeout basis or if batch is terminated from the outside
 */
export class BatchedOperation<T extends OperationType = OperationType> extends Operation<T> {
  /**
   * Array of operations to batch
   */
  operations: (Operation<T> | Operation<OperationType.Neutral>)[] = [];

  /**
   * Batch constructor function
   *
   * @param firstOperation - first operation to add
   */
  constructor(firstOperation: Operation<T> | Operation<OperationType.Neutral>) {
    super(firstOperation.type, firstOperation.index, firstOperation.data, firstOperation.userId, firstOperation.rev);

    if (firstOperation !== undefined) {
      this.add(firstOperation);
    }
  }

  /**
   * Create a new operation batch from an array of operations
   * 
   * @param opBatch - operation batch to clone
   */ 
  public static from<T extends OperationType>(opBatch: BatchedOperation<T>): BatchedOperation<T>;

  /**
   * Create a new operation batch from a serialized operation
   * 
   * @param json - serialized operation
   */
  public static from<T extends OperationType>(json: SerializedOperation<T>): BatchedOperation<T>;

  /**
   * Create a new operation batch from an operation batch or a serialized operation
   * 
   * @param opBatchOrJSON - operation batch or serialized operation
   */ 
  public static from<T extends OperationType>(opBatchOrJSON: BatchedOperation<T> | SerializedOperation<T>): BatchedOperation<T> {
    if (opBatchOrJSON instanceof BatchedOperation) {
      /**
       * Every batch should have at least one operation
       */
      const batch = new BatchedOperation(Operation.from(opBatchOrJSON.operations.shift()!));

      opBatchOrJSON.operations.forEach((op) => {
        /**
         * Deep clone operation to the new batch
         */
        batch.add(Operation.from(op));
      });
    
      return batch as BatchedOperation<T>;
    } else {
      const batch = new BatchedOperation<T>(Operation.from(opBatchOrJSON));

      return batch;  
    }
  }

  /**
   * Adds an operation to the batch
   * Make sure, that operation could be added to the batch
   *
   * @param op - operation to add
   */
  public add(op: Operation<T> | Operation<OperationType.Neutral>): void {
    this.operations.push(op);
  }

  /**
   * Method that inverses all of the operations in the batch
   *
   * @returns new batch with inversed operations
   */
  public inverse(): BatchedOperation<InvertedOperationType<T>> {
    /**
     * Every batch should have at least one operation
     */
    const newBatchedOperation = new BatchedOperation<InvertedOperationType<T> | OperationType.Neutral>(this.operations.pop()!.inverse())

    this.operations.toReversed().map(op => newBatchedOperation.add(op.inverse()));

    return newBatchedOperation as BatchedOperation<InvertedOperationType<T>>;
  }

  /**
   * Method that transforms all of the operations in the batch against another operation
   *
   * @param againstOp - operation to transform against
   * @returns new batch with transformed operations
   */
  public transform<K extends OperationType>(againstOp: Operation<K>): BatchedOperation<T | OperationType.Neutral> {
    const transformedOp = this.operations.shift()!.transform(againstOp);

    const newBatchedOperation = new BatchedOperation(transformedOp);

    this.operations.map(op => newBatchedOperation.add(op.transform(againstOp)));

    return newBatchedOperation;
  }

  /**
   * Checks if operation can be added to the batch
   *
   * Only text operations with the same type (Insert/Delete) on the same block and data key could be added
   *
   * @param op - operation to check
   */
  canAdd(op: Operation): boolean {
    const lastOp = this.operations[this.operations.length - 1];

    if (lastOp === undefined) {
      return true;
    }

    if (!op.index.isTextIndex || !lastOp.index.isTextIndex) {
      return false;
    }

    if (op.type === OperationType.Modify || lastOp.type === OperationType.Modify) {
      return false;
    }

    if (op.type !== lastOp.type) {
      return false;
    }

    if (op.index.blockIndex !== lastOp.index.blockIndex || op.index.dataKey !== lastOp.index.dataKey) {
      return false;
    }

    return op.index.textRange![0] === lastOp.index.textRange![1] + 1;
  }
}
