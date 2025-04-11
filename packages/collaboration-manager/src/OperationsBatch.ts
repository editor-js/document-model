import { InvertedOperationType, Operation, OperationType, SerializedOperation } from './Operation.js';

/**
 * Batch debounce time
 */
const DEBOUNCE_TIMEOUT = 500;

/**
 * Class to batch Text operations (maybe others in the future) for Undo/Redo purposes
 *
 * Operations are batched on timeout basis or if batch is terminated from the outside
 */
export class OperationsBatch<T extends OperationType> extends Operation<T> {
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
   * Adds an operation to the batch
   * Make sure, that operation could be added to the batch
   *
   * @param op - operation to add
   */
  public add(op: Operation<T> | Operation<OperationType.Neutral>): void {
    this.operations.push(op);
  }

  /**
   * Create a new operation batch from an array of operations
   * 
   * @param opBatch - operation batch to clone
   */ 
  public static from<T extends OperationType>(opBatch: OperationsBatch<T>): OperationsBatch<T>;

  /**
   * Create a new operation batch from a serialized operation
   * 
   * @param json - serialized operation
   */
  public static from<T extends OperationType>(json: SerializedOperation<T>): OperationsBatch<T>;

  /**
   * Create a new operation batch from an operation batch or a serialized operation
   * 
   * @param opBatchOrJSON - operation batch or serialized operation
   */ 
  public static from<T extends OperationType>(opBatchOrJSON: OperationsBatch<T> | SerializedOperation<T>): OperationsBatch<T> {
    if (opBatchOrJSON instanceof OperationsBatch) {
      /**
       * Every batch should have at least one operation
       */
      const batch = new OperationsBatch(opBatchOrJSON.operations.shift()!);

      opBatchOrJSON.operations.forEach((op) => {
        /**
         * Deep clone operation to the new batch
         */
        batch.add(Operation.from(op));
      });
    
      return batch as OperationsBatch<T>;
    } else {
      const batch = new OperationsBatch<T>(Operation.from(opBatchOrJSON));

      return batch;  
    }
  }

  /**
   * Method that inverses all of the operations in the batch
   *
   * @returns new batch with inversed operations
   */
  public inverse(): OperationsBatch<InvertedOperationType<T>> {
    /**
     * Every batch should have at least one operation
     */
    const newOperationsBatch = new OperationsBatch<InvertedOperationType<T> | OperationType.Neutral>(this.operations.pop()!.inverse())

    while (this.operations.length > 0) {
      const op = this.operations.pop()!.inverse();

      newOperationsBatch.add(op);
    }

    return newOperationsBatch as OperationsBatch<InvertedOperationType<T>>;
  }

  /**
   * Method that transforms all of the operations in the batch against another operation
   *
   * @param againstOp - operation to transform against
   * @returns new batch with transformed operations
   */
  public transform<K extends OperationType>(againstOp: Operation<K>): OperationsBatch<T | OperationType.Neutral> {
    const transformedOp = this.operations.shift()!.transform(againstOp);

    const newOperationsBatch = new OperationsBatch(transformedOp);

    /**
     * We either have a new operations batch or all operations were not transformable
     */
    for (const op of this.operations) {
      const transformedOp = op.transform(againstOp);

      newOperationsBatch.add(transformedOp);
    }

    return newOperationsBatch;
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
