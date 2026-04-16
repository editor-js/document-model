import { IndexBuilder } from '@editorjs/model';
import { Operation, OperationType } from './Operation.js';
import { getRangesIntersectionType, RangeIntersectionType } from './utils/getRangesIntersectionType.js';

/**
 * Class that transforms operation against another operation
 */
export class OperationsTransformer {
  /**
   * Method that transforms operation against another operation
   *
   * @param operation - operation to be transformed
   * @param againstOp - operation against which the current operation should be transformed
   * @returns {Operation<OperationType>} new operation
   */
  public transform<T extends OperationType>(operation: Operation<T>, againstOp: Operation<OperationType>): Operation<T> | Operation<OperationType.Neutral> {
    /**
     * Do not transform operations if they are on different documents
     */
    if (operation.index.documentId !== againstOp.index.documentId) {
      return Operation.from(operation);
    }

    /**
     * Throw unsupported operation type error if operation type is not supported
     */
    if (!Object.values(OperationType).includes(againstOp.type) || !Object.values(OperationType).includes(operation.type)) {
      throw new Error('Unsupported operation type');
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
   * @returns {Operation<OperationType>} new operation
   */
  #applyTransformation<T extends OperationType>(operation: Operation<T>, againstOp: Operation<OperationType>): Operation<T> | Operation<OperationType.Neutral> {
    const againstIndex = againstOp.index;

    switch (true) {
      case (againstIndex.isBlockIndex):
        return this.#transformAgainstBlockOperation(operation, againstOp);

      case (againstIndex.isTextIndex):
        return this.#transformAgainstTextOperation(operation, againstOp);

      case (againstIndex.isDataIndex):
        return this.#transformAgainstDataOperation(operation, againstOp);

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
   * @returns {Operation<OperationType>} new operation
   */
  #transformAgainstBlockOperation<T extends OperationType>(operation: Operation<T>, againstOp: Operation<OperationType>): Operation<T> | Operation<OperationType.Neutral> {
    const newIndexBuilder = new IndexBuilder().from(operation.index);

    /**
     * If current operation has no block index, return copy of the current operation
     */
    if (operation.index.blockIndex === undefined) {
      return Operation.from(operation);
    }

    /**
     * Check that againstOp affects current operation
     */
    if (againstOp.index.blockIndex! > operation.index.blockIndex!) {
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
        if (againstOp.index.blockIndex! === operation.index.blockIndex!) {
          return new Operation(OperationType.Neutral, newIndexBuilder.build(), { payload: [] }, operation.userId, operation.rev);
        }

        newIndexBuilder.addBlockIndex(operation.index.blockIndex! - 1);

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
   * 1. Current operation is a block operation or data operation
   *    - Text opearation can't affect block operation or data operation so return copy of the current one
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
   * @returns {Operation<OperationType>} new operation
   */
  #transformAgainstTextOperation<T extends OperationType>(operation: Operation<T>, againstOp: Operation<OperationType>): Operation<T> | Operation<OperationType.Neutral> {
    const index = operation.index;
    const againstIndex = againstOp.index;

    /**
     * Cover case 1
     */
    if (index.isBlockIndex || index.isDataIndex) {
      return Operation.from(operation);
    }

    const sameInput = index.dataKey === againstIndex.dataKey;
    const sameBlock = index.blockIndex === againstIndex.blockIndex;

    /**
     * Check that againstOp affects current operation
     */
    if (
      !sameInput || !sameBlock || againstOp.getEffectiveRange()[0] >= operation.getEffectiveRange()[1]) {
      return Operation.from(operation);
    }

    /**
     * @todo cover modify against modify operation
     */
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
   * Method that transforms operation against data (value) operation
   *
   * Cases:
   * 1. Operation is not a data operation
   *    - Return copy of the current operation, text and block operations are not affected by data operations
   * 2. Operation that change different data keys or different block index
   *    - Return copy of the current operation
   * 3. Operation that change the same data key and block index
   *    - Check revision — only latest operation should be applied
   *        - If againstOp has higher revision then current operation revision — treat againstOp as future operation (did not send to OT server yet)
   *          Return Neutral operation — operation should not be applied because againstOp would update OT server model after
   *        - If againstOp has revision lower then current operation revision
   *          Return copy of the current operation, it should be applied after againstOp
   *
   * @param operation - Operation to be transformed
   * @param againstOp - Operation against which the current operation should be transformed
   * @returns {Operation<OperationType>} new transformedoperation
   */
  #transformAgainstDataOperation<T extends OperationType>(operation: Operation<T>, againstOp: Operation<OperationType>): Operation<T> | Operation<OperationType.Neutral> {
    const index = operation.index;
    const againstIndex = againstOp.index;

    const revision = operation.rev!;
    /**
     * If againstOp has no revision (undefined) — it is still not send to the OTServer, and we don't know, when it would be sent
     * Treat it as future operation
     */
    const againstRevision = againstOp.rev === undefined ? Infinity : againstOp.rev!;

    // Cover case 1
    if (!index.isDataIndex) {
      return Operation.from(operation);
    }

    // Cover case 2
    if (index.blockIndex !== againstIndex.blockIndex || index.dataKey !== againstIndex.dataKey) {
      return Operation.from(operation);
    }

    // Cover case 3.1
    if (againstRevision > revision) {
      return new Operation(OperationType.Neutral, index, { payload: [] }, operation.userId, operation.rev);
    }
    
    // Cover case 3.2
    return Operation.from(operation);
  }

  /**
   * Method that transforms operation against text insert operation happened on the left side of the current operation
   *
   * Cases:
   * 1. Operation is an Insert operation
   *    - if op range and against op effective range don't intersect (Left or None) — move text range of the operation to the right by amount of inserted characters
   *    - if op range and against op effective range intersect — insert payload of against operation to the related index of the current operation
   *
   * For non-insert operations:
   * 2. Against operation is fully on the left of the current operation
   *    - Move text range of the current operation to the right by amount of inserted characters
   *
   * 3. Against operation is inside of the current operation text range
   *    - Move right bound of the current operation to the right by amount of inserted characters to include the inserted text
   *
   * @param operation - Operation to be transformed
   * @param againstOp - Operation against which the current operation should be transformed
   * @returns {Operation<OperationType>} new operation
   */
  #transformAgainstTextInsert<T extends OperationType>(operation: Operation<T>, againstOp: Operation<OperationType>): Operation<T> | Operation<OperationType.Neutral> {
    const newIndexBuilder = new IndexBuilder().from(operation.index);
    let newPayload = operation.data.payload as string;

    const insertedLength = againstOp.data.payload!.length;

    const index = operation.index;
    const againstIndex = againstOp.index;

    /**
     * Cover case 1
     */
    if (operation.type === OperationType.Insert) {
      const textRange = operation.getEffectiveRange();

      const effectiveIntersectionType = getRangesIntersectionType(textRange, againstIndex.textRange!);

      switch (effectiveIntersectionType) {
        case RangeIntersectionType.None:
        case RangeIntersectionType.Left:
          newIndexBuilder.addTextRange([index.textRange![0] + insertedLength, index.textRange![1] + insertedLength]);
          break;
        case RangeIntersectionType.Includes:
          /**
           * Insert against op payload inside of the current operation payload to related index
           */
          newPayload = typeof newPayload === 'string'
            ? newPayload.slice(0, againstIndex.textRange![0] - textRange[0]) + againstOp.data.payload! + newPayload.slice(againstIndex.textRange![1] - textRange[0])
            : newPayload;
          break;
      }

      /**
       * Return new operation with the updated index
       */
      const newOp = Operation.from(operation);

      newOp.index = newIndexBuilder.build();
      newOp.data.payload = newPayload;

      return newOp;
    }

    /**
     * For non-insert operations:
     * In this case, againstOp is insert, there would be only two possible intersections:
     * - None - inserted text is on the left side of the current operation
     * - Includes - inserted text is inside of the current operation text range
     */
    const intersectionType = getRangesIntersectionType(operation.index.textRange!, againstOp.index.textRange!);

    switch (intersectionType) {
      case (RangeIntersectionType.None):
      case (RangeIntersectionType.Left):
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
   *    - Payload of the operations stays the same
   *
   * 2. Delete range covers part of the current operation
   *    - Deleted left side of the current operation
   *        - Move left bound of the current operation to the start of the against Delete operation
   *        - Move right bound of the current operation to the left by (amount of deleted characters - amount of characters in the current operation that were deleted)
   *        - Deleted intersection is removed from the payload of the current operation
   *    - Deleted right side of the current operation
   *        - Move right bound of the current operation to the left by amount of deleted intersection
   *        - Deleted intersection is removed from the payload of the current operation
   *
   * 3. Delete range is inside of the current operation text range
   *    - Move right bound of the current operation to the left by amount of deleted characters
   *    - Deleted intersection is removed from the payload of the current operation
   *
   * 4. Delete range fully covers the current operation text rannge
   *    - Return Neutral operation
   *
   * @param operation - Operation to be transformed
   * @param againstOp - Operation against which the current operation should be transformed
   * @returns {Operation<OperationType>} new operation
   */
  #transformAgainstTextDelete<T extends OperationType>(operation: Operation<T>, againstOp: Operation<OperationType>): Operation<T> | Operation<OperationType.Neutral> {
    const newIndexBuilder = new IndexBuilder().from(operation.index);
    let newPayload = operation.data.payload as string;
    const deletedAmount = againstOp.data.payload!.length;

    const textRange = operation.getEffectiveRange();
    const againstTextRange = againstOp.getEffectiveRange();

    const index = operation.index;
    const againstIndex = againstOp.index;

    const intersectionType = getRangesIntersectionType(textRange, againstTextRange);

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
        newPayload = typeof newPayload === 'string' ? newPayload.slice(againstTextRange[1] - textRange[0]) : newPayload;
        break;

      /**
       * Cover case 2.2
       */
      case (RangeIntersectionType.Right):
        newIndexBuilder.addTextRange([index.textRange![0], againstIndex.textRange![0]]);
        newPayload = typeof newPayload === 'string' ? newPayload.slice(0, againstTextRange[0] - textRange[0]) : newPayload;
        break;

      /**
       * Cover case 3
       */
      case (RangeIntersectionType.Includes):
        newIndexBuilder.addTextRange([index.textRange![0], index.textRange![1] - deletedAmount]);
        newPayload = typeof newPayload === 'string'
          ? newPayload.slice(0, againstTextRange[0] - textRange[0]) + newPayload.slice(againstTextRange[1] - textRange[0])
          : newPayload;
        break;

      /**
       * Cover case 4
       */
      case (RangeIntersectionType.IncludedBy):
        return new Operation(OperationType.Neutral, newIndexBuilder.build(), { payload: [] }, operation.userId, operation.rev);
    }

    /**
     * Return new operation with updated index
     */
    const newOp = Operation.from(operation);

    newOp.index = newIndexBuilder.build();
    newOp.data.payload = newPayload;

    return newOp;
  }
}
