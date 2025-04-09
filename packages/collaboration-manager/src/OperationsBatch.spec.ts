import { createDataKey, IndexBuilder } from '@editorjs/model';
import { OperationsBatch } from './OperationsBatch.js';
import { Operation, OperationType } from './Operation.js';
import { jest } from '@jest/globals';

const templateIndex = new IndexBuilder()
  .addBlockIndex(0)
  .addDataKey(createDataKey('key'))
  .addTextRange([0, 0])
  .build();

const userId = 'user';

describe('Batch', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  it('should add Insert operation to batch', () => {
    const op1 = new Operation(OperationType.Insert, templateIndex, { payload: 'a' }, userId);
    const op2 = new Operation(
      OperationType.Insert,
      new IndexBuilder().from(templateIndex)
        .addTextRange([1, 1])
        .build(),
      { payload: 'b' },
      userId,
    );
    const onTimeout = jest.fn();

    const batch = new OperationsBatch(onTimeout, op1);

    batch.add(op2);

    const effectiveOp = batch.getEffectiveOperation();

    expect(effectiveOp).toEqual({
      type: OperationType.Insert,
      index: new IndexBuilder()
        .from(templateIndex)
        .addTextRange([0, 1])
        .build(),
      data: { payload: 'ab' },
      rev: undefined,
      userId,
    });
  });

  it('should add Delete operation to batch', () => {
    const op1 = new Operation(OperationType.Delete, templateIndex, { payload: 'a' }, userId);
    const op2 = new Operation(
      OperationType.Delete,
      new IndexBuilder().from(templateIndex)
        .addTextRange([1, 1])
        .build(),
      { payload: 'b' },
      userId,
    );
    const onTimeout = jest.fn();

    const batch = new OperationsBatch(onTimeout, op1);

    batch.add(op2);

    const effectiveOp = batch.getEffectiveOperation();

    expect(effectiveOp).toEqual({
      type: OperationType.Delete,
      index: new IndexBuilder()
        .from(templateIndex)
        .addTextRange([0, 1])
        .build(),
      data: { payload: 'ab' },
      rev: undefined,
      userId,
    });
  });

  it('should terminate the batch if the new operation is not text operation', () => {
    const op1 = new Operation(OperationType.Delete, templateIndex, { payload: 'a' }, userId);
    const op2 = new Operation(
      OperationType.Delete,
      new IndexBuilder().from(templateIndex)
        .addDataKey(undefined)
        .addTextRange(undefined)
        .build(),
      {
        payload: [
          {
            name: 'paragraph',
            data: { text: '' },
          },
        ],
      },
      userId,
    );

    const onTimeout = jest.fn();

    const batch = new OperationsBatch(onTimeout, op1);

    batch.add(op2);

    expect(onTimeout).toBeCalledWith(batch, op2);
  });

  it('should terminate the batch if operation in the batch is not text operation', () => {
    const op1 = new Operation(
      OperationType.Delete,
      new IndexBuilder().from(templateIndex)
        .addDataKey(undefined)
        .addTextRange(undefined)
        .build(),
      {
        payload: [
          {
            name: 'paragraph',
            data: { text: '' },
          },
        ],
      },
      userId
    );
    const op2 = new Operation(OperationType.Delete, templateIndex, { payload: 'a' }, userId);

    const onTimeout = jest.fn();

    const batch = new OperationsBatch(onTimeout, op1);

    batch.add(op2);

    expect(onTimeout).toBeCalledWith(batch, op2);
  });

  it('should terminate the batch if operation in the batch is Modify operation', () => {
    const op1 = new Operation(
      OperationType.Modify,
      new IndexBuilder().from(templateIndex)
        .build(),
      {
        payload: {
          tool: 'bold',
        },
        prevPayload: {
          tool: 'bold',
        },
      },
      userId
    );
    const op2 = new Operation(OperationType.Delete, templateIndex, { payload: 'a' }, userId);

    const onTimeout = jest.fn();

    const batch = new OperationsBatch(onTimeout, op1);

    batch.add(op2);

    expect(onTimeout).toBeCalledWith(batch, op2);
  });

  it('should terminate the batch if the new operation is Modify operation', () => {
    const op1 = new Operation(OperationType.Delete, templateIndex, { payload: 'a' }, userId);
    const op2 = new Operation(
      OperationType.Modify,
      new IndexBuilder().from(templateIndex)
        .build(),
      {
        payload: {
          tool: 'bold',
        },
        prevPayload: {
          tool: 'bold',
        },
      },
      userId
    );

    const onTimeout = jest.fn();

    const batch = new OperationsBatch(onTimeout, op1);

    batch.add(op2);

    expect(onTimeout).toBeCalledWith(batch, op2);
  });

  it('should terminate the batch if operations are of different type', () => {
    const op1 = new Operation(OperationType.Delete, templateIndex, { payload: 'a' }, userId);
    const op2 = new Operation(
      OperationType.Insert,
      new IndexBuilder().from(templateIndex)
        .addTextRange([1, 1])
        .build(),
      { payload: 'b' },
      userId
    );
    const onTimeout = jest.fn();

    const batch = new OperationsBatch(onTimeout, op1);

    batch.add(op2);

    expect(onTimeout).toBeCalledWith(batch, op2);
  });

  it('should terminate the batch if operations block indexes are not the same', () => {
    const op1 = new Operation(OperationType.Insert, templateIndex, { payload: 'a' }, userId);
    const op2 = new Operation(
      OperationType.Insert,
      new IndexBuilder().from(templateIndex)
        .addBlockIndex(1)
        .addTextRange([1, 1])
        .build(),
      { payload: 'b' },
      userId
    );
    const onTimeout = jest.fn();

    const batch = new OperationsBatch(onTimeout, op1);

    batch.add(op2);

    expect(onTimeout).toBeCalledWith(batch, op2);
  });

  it('should terminate the batch if operations data keys are not the same', () => {
    const op1 = new Operation(OperationType.Insert, templateIndex, { payload: 'a' }, userId);
    const op2 = new Operation(
      OperationType.Insert,
      new IndexBuilder().from(templateIndex)
        .addDataKey(createDataKey('differentKey'))
        .addTextRange([1, 1])
        .build(),
      { payload: 'b' },
      userId
    );
    const onTimeout = jest.fn();

    const batch = new OperationsBatch(onTimeout, op1);

    batch.add(op2);

    expect(onTimeout).toBeCalledWith(batch, op2);
  });

  it('should terminate the batch if operations index ranges are not adjacent', () => {
    const op1 = new Operation(OperationType.Insert, templateIndex, { payload: 'a' }, userId);
    const op2 = new Operation(
      OperationType.Insert,
      new IndexBuilder().from(templateIndex)
        .addTextRange([2, 2])
        .build(),
      { payload: 'b' },
      userId
    );
    const onTimeout = jest.fn();

    const batch = new OperationsBatch(onTimeout, op1);

    batch.add(op2);

    expect(onTimeout).toBeCalledWith(batch, op2);
  });

  it('should terminate the batch if timeout is exceeded', () => {
    const op1 = new Operation(OperationType.Insert, templateIndex, { payload: 'a' }, userId);

    const onTimeout = jest.fn();

    const batch = new OperationsBatch(onTimeout, op1);

    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    jest.advanceTimersByTime(1000);

    expect(onTimeout).toBeCalledWith(batch, undefined);
  });

  it('should return null if there\'s no operations as effective operation in the batch', () => {
    const onTimeout = jest.fn();
    const batch = new OperationsBatch(onTimeout);

    expect(batch.getEffectiveOperation()).toBeNull();
  });

  it('should return the only operation in the batch as effective operation', () => {
    const op1 = new Operation(OperationType.Insert, templateIndex, { payload: 'a' }, userId);

    const onTimeout = jest.fn();

    const batch = new OperationsBatch(onTimeout, op1);

    expect(batch.getEffectiveOperation()).toEqual(op1);
  });
});
