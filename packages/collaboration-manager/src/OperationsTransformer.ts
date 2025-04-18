import { IndexBuilder } from "@editorjs/model";
import { Operation, OperationType } from "./Operation";
import { getRangesIntersectionType, RangeIntersectionType } from "./utils/getRangesIntersectionType";

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

    return this.#applyTransformation<T>(operation, againstOp);
  }

  /**
   * Method that returns new operation based on the type of againstOp index
   * Cases:
   * 1. Against operation is a block operation and current operation is also a block operation
   * - check if againstOp affects current operation, update operation's block index
   * 
   * 2. Against operation is a block operation and current operation is a text operation
   * - same as above, check if againstOp affects current operation and update operation's block index
   * 
   * 3. Against operation is a text operation and current operation is a block operation
   * - text operation does not afftect block operation - so return copy of current operation
   * 
   * 4. Against operation is a text operation and current operation is also a text operation
   * - check if againstOp affects current operation and update operation's text index
   * 
   * @param operation - operation to be transformed
   * @param againstOp - operation against which the current operation should be transformed
   * @returns new operation
   */
  #applyTransformation<T extends OperationType>(operation: Operation<T>, againstOp: Operation<OperationType>): Operation<T> | Operation<OperationType.Neutral> {
    const againstIndex = againstOp.index;

    switch (true) {
      case (againstIndex.isBlockIndex):
        return this.#transformAgainstBlockOperation(operation, againstOp); 

      case (againstIndex.isTextIndex):
        return this.#transformAgainstTextOperation(operation, againstOp);

      /**
       * @todo Cover all index types
       */
      default:
        throw new Error('Unsupported index type');
    }
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
     * If current operation has no block index, return copy of the current operation
     */
    if (!operation.index.isBlockIndex) {
      return Operation.from(operation);
    }

    /**
     * Check that againstOp affects current operation
     */
    if (againstOp.index.blockIndex! <= operation.index.blockIndex!) {
      return Operation.from(operation);
    }

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
    const newOp = Operation.from(operation);

    newOp.index = newIndexBuilder.build();

    return newOp;
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
    const index = operation.index;
    const againstIndex = againstOp.index;
    
    /**
     * Cover case 1
     */
    if (index.isBlockIndex) {
      return Operation.from(operation);
    }

    /**
     * Check that againstOp affects current operation
     */
    if (index.dataKey === againstIndex.dataKey && index.blockIndex === againstIndex.blockIndex && againstIndex.textRange![0] > index.textRange![1]) {
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

    const insertedLength = againstOp.data.payload!.length;

    const index = operation.index;
    const againstIndex = againstOp.index;

    /**
     * In this case, againstOp is insert operatioin, there would be only two possible intersections
     * - None - inserted text is on the left side of the current operation
     * - Includes - inserted text is inside of the current operation text range
     */
    const intersectionType = getRangesIntersectionType(index.textRange!, againstIndex.textRange!);

    switch (intersectionType) {
      case (RangeIntersectionType.None):
        newIndexBuilder.addTextRange([index.textRange![0] + insertedLength, index.textRange![1] + insertedLength]);
        break;

      case (RangeIntersectionType.Includes):
        newIndexBuilder.addTextRange([index.textRange![0], index.textRange![1] + insertedLength]);
        break;
    }

    /**
     * Return new operation with the updated index
     */
    const newOp = Operation.from(operation);

    newOp.index = newIndexBuilder.build();

    return newOp;
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

    const index = operation.index;
    const againstIndex = againstOp.index;
    
    const intersectionType = getRangesIntersectionType(index.textRange!, againstIndex.textRange!);

    switch (intersectionType) {
      /**
       * Cover case 1
       */
      case (RangeIntersectionType.None):
        newIndexBuilder.addTextRange([index.textRange![0] - deletedAmount, index.textRange![1] - deletedAmount]);
        break;

      /**
       * Cover case 2.1
       */
      case (RangeIntersectionType.Left):
        newIndexBuilder.addTextRange([againstIndex.textRange![0], index.textRange![1] - deletedAmount]);
        break;

      /**
       * Cover case 2.2
       */
      case (RangeIntersectionType.Right):
        const overlapLength = index.textRange![1] - againstIndex.textRange![0];

        newIndexBuilder.addTextRange([index.textRange![0], index.textRange![1] - overlapLength]);
        break;

      /**
       * Cover case 3
       */
      case (RangeIntersectionType.Includes):
        newIndexBuilder.addTextRange([index.textRange![0], index.textRange![1] - deletedAmount]);
        break;

      /**
       * Cover case 4
       */
      case (RangeIntersectionType.Included):
        return new Operation(OperationType.Neutral, newIndexBuilder.build(), { payload: [] }, operation.userId, operation.rev);
    }

    /**
     * Return new operation with updated index
     */
    const newOp = Operation.from(operation);

    newOp.index = newIndexBuilder.build();

    return newOp;
  }
}