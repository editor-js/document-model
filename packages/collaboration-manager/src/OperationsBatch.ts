import { IndexBuilder, type TextRange } from '@editorjs/model';
import { Operation, OperationType } from './Operation.js';

/**
 * Batch debounce time
 */
const DEBOUNCE_TIMEOUT = 500;

/**
 * Batch termination callback
 *
 * @param batch - terminated batch
 * @param [lastOperation] - operation on which the batch was terminated
 */
type OnBatchTermination = (batch: OperationsBatch, lastOperation?: Operation) => void;

/**
 * Class to batch Text operations (maybe others in the future) for Undo/Redo purposes
 *
 * Operations are batched on timeout basis or if batch is terminated from the outside
 */
export class OperationsBatch {
  /**
   * Array of operations to batch
   *
   * @private
   */
  #operations: Operation[] = [];

  /**
   * Termination callback
   */
  #onTermination: OnBatchTermination;

  /**
   * Termination timeout
   */
  #debounceTimer?: ReturnType<typeof setTimeout>;

  /**
   * Batch constructor function
   *
   * @param onTermination - termination callback
   * @param firstOperation - first operation to add
   */
  constructor(onTermination: OnBatchTermination = () => {}, firstOperation?: Operation) {
    this.#onTermination = onTermination;

    if (firstOperation !== undefined) {
      this.add(firstOperation);
    }
  }

  /**
   * Adds an operation to the batch
   *
   * @param op - operation to add
   */
  public add(op: Operation): void {
    if (!this.#canAdd(op)) {
      this.terminate(op);

      return;
    }

    this.#operations.push(op);

    clearTimeout(this.#debounceTimer);
    this.#debounceTimer = setTimeout(() => this.terminate(), DEBOUNCE_TIMEOUT);
  }


  /**
   * Returns and effective operations for all the operations in the batch
   */
  public getEffectiveOperation(): Operation | null {
    if (this.#operations.length === 0) {
      return null;
    }

    if (this.#operations.length === 1) {
      return this.#operations[0];
    }

    const type = this.#operations[0].type;
    const index = this.#operations[0].index;

    const range: TextRange = [
      this.#operations[0].index.textRange![0],
      this.#operations[this.#operations.length - 1].index.textRange![1],
    ];
    const payload = this.#operations.reduce((text, operation) => text + operation.data.payload, '');

    return new Operation(
      type,
      new IndexBuilder().from(index)
        .addTextRange(range)
        .build(),
      { payload },
      this.#operations[0].userId
    );
  }

  /**
   * Terminates the batch, passes operation on which batch was terminated to the callback
   *
   * @param lastOp - operation on which the batch is terminated
   */
  public terminate(lastOp?: Operation): void {
    clearTimeout(this.#debounceTimer);

    this.#onTermination(this, lastOp);
  }

  /**
   * Checks if operation can be added to the batch
   *
   * Only text operations with the same type (Insert/Delete) on the same block and data key could be added
   *
   * @param op - operation to check
   */
  #canAdd(op: Operation): boolean {
    const lastOp = this.#operations[this.#operations.length - 1];

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
