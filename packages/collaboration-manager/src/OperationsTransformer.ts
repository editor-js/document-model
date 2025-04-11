import { IndexBuilder } from "@editorjs/model";
import { Operation, OperationType } from "./Operation";

/**
 * Class that transforms operation against another operation
 */
export class OperationsTransformer {
  constructor() {}

  public transform<T extends OperationType>(operation: Operation<T>, againstOp: Operation<OperationType>): Operation<T> | Operation<OperationType.Neutral> {
    /**
     * Do not transform operations if they are on different documents
     */
    if (operation.index.documentId !== againstOp.index.documentId) {
      return Operation.from(operation);
    }

    return this.#determineTransformation<T>(operation, againstOp);
  }

  /**
   * Method that desides what kind of transformation should be applied to the operation
   * Cases:
   * 1. Against operations is a block operation and current operation is also a block operation
   * - check that againstOp affects current operation and transform against block operation
   * 
   * 2. Against operation is a block operation and current operation is a text operation
   * - same as above, check that againstOp affects current operation and transform against block operation
   * 
   * 3. Against operation is a text operation and current operation is a block operation
   * - text operation does not afftect block operation - so return copy of current operation
   * 
   * 4. Against operation is a text operation and current operation is also a text operation
   * - check that againstOp affects current operation and transform against text operation
   * 
   * @param operation - operation to be transformed
   * @param againstOp - operation against which the current operation should be transformed
   * @returns new operation
   */
  #determineTransformation<T extends OperationType>(operation: Operation<T>, againstOp: Operation<OperationType>): Operation<T> | Operation<OperationType.Neutral> {
    const currentIndex = operation.index;
    const againstIndex = againstOp.index;

    /**
     * Cover 1 and 2 cases
     * 
     * Check that againstOp is a block operation
     */
    if (againstIndex.isBlockIndex && currentIndex.blockIndex !== undefined) {
      /**
       * Check that againstOp affects current operation
       */
      if (againstIndex.blockIndex! <= currentIndex.blockIndex) {
        return this.#transformAgainstBlockOperation(operation, againstOp);
      }
    }

    /**
     * Cover 4 case
     * 
     * Check that againstOp is a text operation and current operation is also a text operation
     */
    if (againstIndex.isTextIndex && currentIndex.isTextIndex) {
      /**
       * Check that againstOp affects current operation (text operation on the same block and same input)
       * and against op happened on the left side or has overlapping range
       */
      if (currentIndex.dataKey === againstIndex.dataKey && currentIndex.blockIndex === againstIndex.blockIndex && againstIndex.textRange![0] <= currentIndex.textRange![0]) {
        return this.#transformAgainstTextOperation(operation, againstOp);
      }
    }

    /**
     * Cover 3 case
     * 
     * Return copy of current operation
     */
    return Operation.from(operation);
  }

  /**
   * Method that transforms operation against block operation
   * 
   * Cases:
   * 1. Against operation is an Insert operation  
   *    - Increase block index of the current operation
   * 
   * 2. Against operation is a Delete operation  
   *    - Against operation deleted a block before the current operation
   *        - Decrease block index of the current operation
   *    - Against operation deleted exactly the block of the current operation
   *        - Return Neutral operation
   * 
   * 3. Against operation is a Modify or Neutral operation  
   *    - Modify and Neutral operations do not affect any operations so return copy of the current operation
   * 
   * @param operation - Operation to be transformed
   * @param againstOp - Operation against which the current operation should be transformed
   * @returns New operation
   */
  #transformAgainstBlockOperation<T extends OperationType>(operation: Operation<T>, againstOp: Operation<OperationType>): Operation<T> | Operation<OperationType.Neutral> {
    const newIndexBuilder = new IndexBuilder().from(operation.index);
    
    /**
     * Update the index of the current operation
     */
    switch (againstOp.type) {
      /**
       * Cover case 1
       */
      case OperationType.Insert:
        newIndexBuilder.addBlockIndex(operation.index.blockIndex! + 1);
        break;

      /**
       * Cover case 2
       */
      case OperationType.Delete:
        if (operation.index.isBlockIndex) {
          if (againstOp.index.blockIndex! < operation.index.blockIndex!) {
            newIndexBuilder.addBlockIndex(operation.index.blockIndex! - 1);
          } else {
            return new Operation(OperationType.Neutral, newIndexBuilder.build(), { payload: [] }, operation.userId, operation.rev);
          }
        }

        break;

      /**
       * Cover case 3
       */
      default:
        return Operation.from(operation);      
    }

    /**
     * Return new operation with the updated index
     */
    return new Operation(operation.type, newIndexBuilder.build(), operation.data, operation.userId, operation.rev);
  }

  /**
   * Method that transforms operation against text operation
   * 
   * Cases:
   * 1. Current operation is a block operation
   *    - Text opearation cant affect block operation so return copy of the current one
   * 
   * 2. Current operation is a text operation
   *    - Against operation is Insert
   *        - Transform current operation against textInsert
   *    - Against operation is Delete
   *        - Check that againstOp affects current operation and transform against text operation
   *    - Against operation is Modify or Neutral
   *        - Modify and Neutral operations do not affect any of the text operations so return copy of the current operation
   * 
   * @param operation - Operation to be transformed
   * @param againstOp - Operation against which the current operation should be transformed
   * @returns New operation
   */
  #transformAgainstTextOperation<T extends OperationType>(operation: Operation<T>, againstOp: Operation<OperationType>): Operation<T> | Operation<OperationType.Neutral> {
    /**
     * Cover case 1
     */
    if (operation.index.isBlockIndex) {
      return Operation.from(operation);
    }

    switch (againstOp.type) {
      case OperationType.Insert:
        return this.#transformAgainstTextInsert(operation, againstOp);

      case OperationType.Delete:
        return this.#transformAgainstTextDelete(operation, againstOp);

      default:
        return Operation.from(operation);
    }
  }

  /**
   * Method that transforms operation against text insert operation happened on the left side of the current operation
   * 
   * Cases:
   * 1. Against operation is fully on the left of the current operation
   *    - Move text range of the current operation to the right by amount of inserted characters
   * 
   * 2. Against operation is inside of the current operation text range
   *    - Move right bound of the current operation to the right by amount of inserted characters to include the inserted text
   * 
   * @param operation - Operation to be transformed
   * @param againstOp - Operation against which the current operation should be transformed
   * @returns New operation
   */
  #transformAgainstTextInsert<T extends OperationType>(operation: Operation<T>, againstOp: Operation<OperationType>): Operation<T> | Operation<OperationType.Neutral> {
    const newIndexBuilder = new IndexBuilder().from(operation.index);

    const amountOfInsertedCharacters = againstOp.data.payload!.length;
    const againstOpIsOnTheLeft = againstOp.index.textRange![0] < operation.index.textRange![0];
    const currentOpAgregatesAgainstOp = (operation.index.textRange![0] <= againstOp.index.textRange![0]) && (operation.index.textRange![1] >= againstOp.index.textRange![1]);

    /**
     * Cover case 1
     */
    if (againstOpIsOnTheLeft) {
      /**
       * Move text index of the current operation to the right by amount of inserted characters
       */
      newIndexBuilder.addTextRange([againstOp.index.textRange![0] + amountOfInsertedCharacters, againstOp.index.textRange![1] + amountOfInsertedCharacters]);
    }

    /**
     * Cover case 2
     */
    if (currentOpAgregatesAgainstOp) {
      /**
       * Move right bound of the current operation to the right by amount of inserted characters to include the inserted text
       */
      newIndexBuilder.addTextRange([operation.index.textRange![0], operation.index.textRange![1] + amountOfInsertedCharacters]);
    }

    return new Operation(operation.type, newIndexBuilder.build(), operation.data, operation.userId, operation.rev);
  }

  /**
   * Method that transforms operation against text delete operation
   * 
   * Cases:
   * 1. Delete range is fully on the left of the current operation
   *    - Move text range of the current operation to the left by amount of deleted characters
   * 
   * 2. Delete range covers part of the current operation
   *    - Deleted left side of the current operation
   *        - Move left bound of the current operation to the start of the against Delete operation
   *        - Move right bound of the current operation to the left by (amount of deleted characters - amount of characters in the current operation that were deleted)
   *    - Deleted right side of the current operation
   *        - Move right bound of the current operation to the left by amount of deleted intersection
   * 
   * 3. Delete range is inside of the current operation text range
   *    - Move right bound of the current operation to the left by amount of deleted characters
   * 
   * 4. Delete range fully covers the current operation text rannge
   *    - Return Neutral operation
   * 
   * @param operation - Operation to be transformed
   * @param againstOp - Operation against which the current operation should be transformed
   * @returns New operation
   */
  #transformAgainstTextDelete<T extends OperationType>(operation: Operation<T>, againstOp: Operation<OperationType>): Operation<T> | Operation<OperationType.Neutral> {
    const newIndexBuilder = new IndexBuilder().from(operation.index);

    const deletedAmount = againstOp.data.payload!.length;

    const deleteIsOnTheLeft = againstOp.index.textRange![1] < operation.index.textRange![0];

    const deletedLeftSide = (againstOp.index.textRange![0] <= operation.index.textRange![0])
      && (againstOp.index.textRange![1] < operation.index.textRange![1])
      && (againstOp.index.textRange![1] > operation.index.textRange![0]);

    const deletedRightSide = (againstOp.index.textRange![0] > operation.index.textRange![0])
      && (againstOp.index.textRange![0] < operation.index.textRange![1])
      && (againstOp.index.textRange![1] <= operation.index.textRange![1]);

    const deletedInside = (againstOp.index.textRange![0] > operation.index.textRange![0])
      && (againstOp.index.textRange![1] < operation.index.textRange![1]);

    const deletedFull = (againstOp.index.textRange![0] <= operation.index.textRange![0])
      && (againstOp.index.textRange![1] >= operation.index.textRange![1]);

    /**
     * Cover case 1
     */
    if (deleteIsOnTheLeft) {
      newIndexBuilder.addTextRange([operation.index.textRange![0] - deletedAmount, operation.index.textRange![1] - deletedAmount]);
    }

    /**
     * Cover case 2.1
     */
    if (deletedLeftSide) {
      const deletedFromCurrentOpRange = operation.index.textRange![0] - againstOp.index.textRange![1];

      newIndexBuilder.addTextRange([againstOp.index.textRange![0], operation.index.textRange![1] - deletedFromCurrentOpRange]);
    }

    /**
     * Cover case 2.2
     */
    if (deletedRightSide) {
      const deletedFromCurrentOpRange = operation.index.textRange![1] - againstOp.index.textRange![0];

      newIndexBuilder.addTextRange([operation.index.textRange![0], operation.index.textRange![1] - deletedFromCurrentOpRange]);
    }

    /**
     * Cover case 3
     */
    if (deletedInside) {
      newIndexBuilder.addTextRange([operation.index.textRange![0], operation.index.textRange![1] - deletedAmount]);
    }

    /**
     * Cover case 4
     */
    if (deletedFull) {
      return new Operation(OperationType.Neutral, newIndexBuilder.build(), { payload: [] }, operation.userId, operation.rev);
    }

    /**
     * Return new operation with updated index
     */
    return new Operation(operation.type, newIndexBuilder.build(), operation.data, operation.userId, operation.rev);
  }
}