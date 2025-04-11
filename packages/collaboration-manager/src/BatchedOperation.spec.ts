import { createDataKey, IndexBuilder } from '@editorjs/model';
import { OperationsBatch } from './BatchedOperation.js';
import { Operation, OperationType, SerializedOperation } from './Operation.js';

const templateIndex = new IndexBuilder()
  .addBlockIndex(0)
  .addDataKey(createDataKey('key'))
  .addTextRange([0, 0])
  .build();

const userId = 'user';

describe('Batch', () => {
  it('should add Insert operation to batch', () => {
    const op1 = new Operation(OperationType.Insert, templateIndex, { payload: 'a' }, userId);
    const op2 = new Operation(
      OperationType.Insert,
      new IndexBuilder().from(templateIndex)
        .addTextRange([1, 1])
        .build(),
      { payload: 'b' },
      userId
    );

    const batch = new OperationsBatch(op1);

    batch.add(op2);

    const operations = batch.operations;

    expect(operations).toEqual([op1, op2]);
  });

  it('should add Delete operation to batch', () => {
    const op1 = new Operation(OperationType.Delete, templateIndex, { payload: 'a' }, userId);
    const op2 = new Operation(
      OperationType.Delete,
      new IndexBuilder().from(templateIndex)
        .addTextRange([1, 1])
        .build(),
      { payload: 'b' },
      userId
    );

    const batch = new OperationsBatch(op1);

    batch.add(op2);

    const operations = batch.operations;

    expect(operations).toEqual([op1, op2]);
  });

  describe('from()', () => {
    it('should create a new batch from an existing batch', () => {
      const op1 = new Operation(OperationType.Insert, templateIndex, { payload: 'a' }, userId);
      const op2 = new Operation(
        OperationType.Insert,
        new IndexBuilder().from(templateIndex).addTextRange([1, 1]).build(),
        { payload: 'b' },
        userId
      );
      const originalBatch = new OperationsBatch(op1);
      originalBatch.add(op2);

      const newBatch = OperationsBatch.from(originalBatch);

      expect(newBatch.operations).toEqual(originalBatch.operations);
      expect(newBatch).not.toBe(originalBatch); // Should be a new instance
    });

    it('should create a new batch from serialized operation', () => {
      const serializedOp: SerializedOperation<OperationType> = new Operation(OperationType.Delete, templateIndex, { payload: 'a' }, userId).serialize();

      const batch = OperationsBatch.from(serializedOp);

      expect(batch.operations[0].type).toBe(serializedOp.type);
      expect(batch.operations[0].data).toEqual(serializedOp.data);
    });
  });

  describe('inverse()', () => {
    it('should inverse all operations in the batch', () => {
      const op1 = new Operation(OperationType.Insert, templateIndex, { payload: 'a' }, userId);
      const op2 = new Operation(
        OperationType.Insert,
        new IndexBuilder().from(templateIndex).addTextRange([1, 1]).build(),
        { payload: 'b' },
        userId
      );
      const batch = new OperationsBatch(op1);
      batch.add(op2);

      const inversedBatch = batch.inverse();

      expect(inversedBatch.operations[0].type).toBe(OperationType.Delete);
      expect(inversedBatch.operations[1].type).toBe(OperationType.Delete);
    });
  });

  describe('transform()', () => {
    it('should transform operations against another operation', () => {
      const op1 = new Operation(OperationType.Insert, templateIndex, { payload: 'a' }, userId);
      const op2 = new Operation(
        OperationType.Insert,
        new IndexBuilder().from(templateIndex).addTextRange([1, 1]).build(),
        { payload: 'b' },
        userId
      );
      const batch = new OperationsBatch(op1);
      batch.add(op2);

      const againstOp = new Operation(
        OperationType.Insert,
        new IndexBuilder().from(templateIndex).addTextRange([0, 0]).build(),
        { payload: 'x' },
        'other-user'
      );

      const transformedBatch = batch.transform(againstOp);

      expect(transformedBatch).not.toBeNull();
      expect(transformedBatch!.operations.length).toBe(2);
      // Check if text ranges were shifted by 1 due to insertion
      expect(transformedBatch!.operations[0].index.textRange![0]).toBe(1);
      expect(transformedBatch!.operations[1].index.textRange![0]).toBe(2);
    });

    it('should return null if no operations can be transformed', () => {
      const op = new Operation(OperationType.Insert, templateIndex, { payload: 'a' }, userId);
      const batch = new OperationsBatch(op);
      
      // An operation that would make transformation impossible
      const againstOp = new Operation(OperationType.Delete, templateIndex, { payload: 'a' }, 'other-user');

      const transformedBatch = batch.transform(againstOp);

      expect(transformedBatch).toBeNull();
    });
  });

  describe('canAdd()', () => {
    it('should return true for consecutive text operations of same type', () => {
      const op1 = new Operation(OperationType.Insert, templateIndex, { payload: 'a' }, userId);
      const op2 = new Operation(
        OperationType.Insert,
        new IndexBuilder().from(templateIndex).addTextRange([1, 1]).build(),
        { payload: 'b' },
        userId
      );
      const batch = new OperationsBatch(op1);

      expect(batch.canAdd(op2)).toBe(true);
    });

    it('should return false for non-consecutive text operations', () => {
      const op1 = new Operation(OperationType.Insert, templateIndex, { payload: 'a' }, userId);
      const op2 = new Operation(
        OperationType.Insert,
        new IndexBuilder().from(templateIndex).addTextRange([2, 2]).build(),
        { payload: 'b' },
        userId
      );
      const batch = new OperationsBatch(op1);

      expect(batch.canAdd(op2)).toBe(false);
    });

    it('should return false for different operation types', () => {
      const op1 = new Operation(OperationType.Insert, templateIndex, { payload: 'a' }, userId);
      const op2 = new Operation(
        OperationType.Delete,
        new IndexBuilder().from(templateIndex).addTextRange([1, 1]).build(),
        { payload: 'b' },
        userId
      );
      const batch = new OperationsBatch(op1);

      expect(batch.canAdd(op2)).toBe(false);
    });

    it('should return false for modify operations', () => {
      const op1 = new Operation(OperationType.Insert, templateIndex, { payload: 'a' }, userId);
      const op2 = new Operation(
        OperationType.Modify,
        new IndexBuilder().from(templateIndex).addTextRange([1, 1]).build(),
        { payload: { tool: 'bold' } },
        userId
      );
      const batch = new OperationsBatch(op1);

      expect(batch.canAdd(op2)).toBe(false);
    });
  });
});
