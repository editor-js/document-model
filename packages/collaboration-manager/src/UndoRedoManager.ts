import type { Operation } from './Operation.js';
import { Transformer } from './Transformer.js';

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

    const inversedOperation = Transformer.inverse(operation);

    this.#redoStack.push(operation);

    return inversedOperation;
  }

  /**
   * Returns operation to redo (if any)
   */
  public redo(): Operation | undefined {
    const operation = this.#redoStack.pop();

    if (operation === undefined) {
      return;
    }

    return operation;
  }

  /**
   * Put operation to undo stack
   *
   * @param operation - operation to put
   */
  public putToUndoStack(operation: Operation): void {
    this.#undoStack.push(operation);
  }

  /**
   * Put operation to redo stack
   *
   * @param operation - operation to put
   */
  public putToRedoStack(operation: Operation): void {
    this.#redoStack.push(operation);
  }

  /**
   * Flushes undo stack
   */
  public flushRedoStack(): void {
    this.#redoStack = [];
  }
}
