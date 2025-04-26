import { BatchedOperation } from './BatchedOperation.js';
import type { Operation } from './Operation.js';

/**
 * Manages undo and redo operations
 */
export class UndoRedoManager {
  /**
   * Local stack of operations to undo
   */
  #undoStack: Operation[] = [];

  /**
   * Local stack of operations to redo
   */
  #redoStack: Operation[] = [];

  /**
   * Returns operation to undo (if any)
   */
  public undo(): Operation | undefined {
    const operation = this.#undoStack.pop();

    if (operation === undefined) {
      return;
    }

    const invertedOperation = operation.inverse();

    console.log('inverted operation', JSON.stringify(invertedOperation));

    this.#redoStack.push(invertedOperation);

    return invertedOperation;
  }

  /**
   * Returns operation to redo (if any)
   */
  public redo(): Operation | undefined {
    const operation = this.#redoStack.pop();

    if (operation === undefined) {
      return;
    }

    const invertedOperation = operation.inverse();


    this.#undoStack.push(invertedOperation);

    return invertedOperation;
  }

  /**
   * Put operation to undo stack and clear redo stack
   *
   * @param operation - operation to put
   */
  public put(operation: Operation): void {
    this.#undoStack.push(operation);
    this.#redoStack = [];
  }

  /**
   * Transforms undo and redo stacks
   *
   * @param operation - operation to transform against
   */
  public transformStacks(operation: Operation): void {
    console.log('transform undo')
    this.transformStack(operation, this.#undoStack);
    console.log('transform redo')
    this.transformStack(operation, this.#redoStack);
  }

  /**
   * Transforms passed operations stack against the operation
   *
   * @param operation - operation to transform against
   * @param stack - stack to transform
   */
  public transformStack(operation: Operation, stack: Operation[]): void {
    const transformed = stack.flatMap((op) => {
      console.log('op in stack', op)
      const transformedOp = op.transform(operation);

      if (transformedOp === null) {
        return [];
      }

      return [ transformedOp ];
    });

    stack.length = 0;
    stack.push(...transformed);
  }
}
