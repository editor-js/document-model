/* eslint-disable @typescript-eslint/no-magic-numbers */
import type { BlockNodeSerialized, DataKey } from '@editorjs/model';
import { IndexBuilder } from '@editorjs/model';
import { describe } from '@jest/globals';
import { type InsertOrDeleteOperationData, type ModifyOperationData, Operation, OperationType } from './Operation.js';

const createOperation = (
  type: OperationType,
  startIndex: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: string | [ BlockNodeSerialized ] | Record<any, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prevValue?: Record<any, any>
): Operation => {
  const index = new IndexBuilder()
    .addBlockIndex(0);

  if (Array.isArray(value)) {
    index.addBlockIndex(startIndex);
  } else {
    index.addDataKey('text' as DataKey).addTextRange([startIndex, startIndex]);
  }

  const data: InsertOrDeleteOperationData | ModifyOperationData = {
    payload: value as ArrayLike<never>,
    prevPayload: null,
  };

  if (type === OperationType.Modify && prevValue !== undefined) {
    (data as ModifyOperationData).prevPayload = prevValue;
  }

  return new Operation(
    type,
    index.build(),
    data,
    'user'
  );
};


describe('Operation', () => {
  describe('.inverse()', () => {
    it('should change the type of Insert operation to Delete operation', () => {
      const op = createOperation(OperationType.Insert, 0, 'abc');
      const inverted = op.inverse();

      expect(inverted.type).toEqual(OperationType.Delete);
    });

    it('should change the type of Delete operation to Insert operation', () => {
      const op = createOperation(OperationType.Delete, 0, 'abc');
      const inverted = op.inverse();

      expect(inverted.type).toEqual(OperationType.Insert);
    });

    it('should not change the type of Modify operation', () => {
      const op = createOperation(OperationType.Modify, 0, { bold: true }, { bold: false });
      const inverted = op.inverse();

      expect(inverted.type).toEqual(OperationType.Modify);
    });

    it('should not change index', () => {
      const op = createOperation(OperationType.Insert, 0, 'abc');
      const inverted = op.inverse();

      expect(inverted.index).toEqual(op.index);
    });

    it('should not change the data', () => {
      const op = createOperation(OperationType.Insert, 0, 'abc');
      const inverted = op.inverse();

      expect(inverted.data).toEqual(op.data);
    });

    it('should flip the current and previous values of Modify operations', () => {
      const op = createOperation(OperationType.Modify, 0, { bold: true }, { bold: false });
      const inverted = op.inverse();

      expect(inverted.data).toEqual({ payload: { bold: false },
        prevPayload: { bold: true } });
    });

    it('should throw an error if unsupported operation type is provided', () => {
      // @ts-expect-error — for test purposes
      const op = createOperation('unsupported', 0, 'def');

      expect(() => op.inverse()).toThrow('Unsupported operation type');
    });
  });
});
