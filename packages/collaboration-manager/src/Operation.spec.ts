/* eslint-disable @typescript-eslint/no-magic-numbers */
import type { BlockNodeSerialized, DataKey, DocumentIndex } from '@editorjs/model';
import { IndexBuilder } from '@editorjs/model';
import { describe } from "@jest/globals";
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
    index.addDataKey('text' as DataKey).addTextRange([ startIndex, startIndex ]);
  }

  const data: InsertOrDeleteOperationData | ModifyOperationData = {
    payload: value as ArrayLike<never>,
    prevPayload: undefined,
  };

  if (type === OperationType.Modify && prevValue !== undefined) {
    (data as ModifyOperationData).prevPayload = prevValue;
  }

  return new Operation(
    type,
    index.build(),
    data,
  );
};


describe('Operation', () => {
  describe('.transform()', () => {
    it('should not change operation if document ids are different', () => {
      const receivedOp = createOperation(OperationType.Insert, 0, 'abc');
      const localOp = createOperation(OperationType.Insert, 0, 'def');

      localOp.index.documentId = 'document2' as DocumentIndex;
      const transformedOp = receivedOp.transform(localOp);

      expect(transformedOp).toEqual(receivedOp);
    });

    it('should not change operation if data keys are different', () => {
      const receivedOp = createOperation(OperationType.Insert, 0, 'abc');
      const localOp = createOperation(OperationType.Insert, 0, 'def');

      localOp.index.dataKey = 'dataKey2' as DataKey;

      const transformedOp = receivedOp.transform(localOp);

      expect(transformedOp).toEqual(receivedOp);
    });

    it('should not change operation if operation is not Block or Text operation', () => {
      const receivedOp = createOperation(OperationType.Insert, 0, 'abc');
      const localOp = createOperation(OperationType.Insert, 0, 'def');

      localOp.index.textRange = undefined;

      const transformedOp = receivedOp.transform(localOp);

      expect(transformedOp).toEqual(receivedOp);
    });

    it('should throw an error if unsupported operation type is provided', () => {
      const receivedOp = createOperation(OperationType.Insert, 0, 'def');
      // @ts-expect-error — for test purposes
      const localOp = createOperation('unsupported', 0, 'def');

      expect(() => receivedOp.transform(localOp)).toThrow('Unsupported operation type');
    });

    it('should not transform relative the Modify operation', () => {
      const receivedOp = createOperation(OperationType.Insert, 0, 'abc');
      const localOp = createOperation(OperationType.Modify, 0, 'def');
      const transformedOp = receivedOp.transform(localOp);

      expect(transformedOp).toEqual(receivedOp);
    });

    describe('Transformation relative to Insert operation', () => {
      it('should not change a received operation if it is before a local one', () => {
        const receivedOp = createOperation(OperationType.Insert, 0, 'abc');
        const localOp = createOperation(OperationType.Insert, 3, 'def');
        const transformedOp = receivedOp.transform(localOp);

        expect(transformedOp).toEqual(receivedOp);
      });

      it('should transform an index for a received operation if it is after a local one', () => {
        const receivedOp = createOperation(OperationType.Delete, 3, 'def');
        const localOp = createOperation(OperationType.Insert, 0, 'abc');
        const transformedOp = receivedOp.transform(localOp);

        expect(transformedOp.index.textRange).toEqual([ 6, 6 ]);
      });

      it('should transform a received operation if it is at the same position as a local one', () => {
        const receivedOp = createOperation(OperationType.Modify, 0, 'abc');
        const localOp = createOperation(OperationType.Insert, 0, 'def');
        const transformedOp = receivedOp.transform(localOp);

        expect(transformedOp.index.textRange).toEqual([ 3, 3 ]);
      });

      it('should not change the text index if local op is a Block operation', () => {
        const receivedOp = createOperation(OperationType.Modify, 0, 'abc');
        const localOp = createOperation(OperationType.Insert, 0, [ {
          name: 'paragraph',
          data: { text: 'hello' },
        } ]);
        const transformedOp = receivedOp.transform(localOp);

        expect(transformedOp.index.textRange).toEqual([ 0, 0 ]);
      });

      it('should not change the operation if local op is a Block operation after a received one', () => {
        const receivedOp = createOperation(OperationType.Insert, 0, [ {
          name: 'paragraph',
          data: { text: 'abc' },
        } ]);
        const localOp = createOperation(OperationType.Insert, 1, [ {
          name: 'paragraph',
          data: { text: 'hello' },
        } ]);

        const transformedOp = receivedOp.transform(localOp);

        expect(transformedOp).toEqual(receivedOp);
      });

      it('should adjust the block index if local op is a Block operation before a received one', () => {
        const receivedOp = createOperation(OperationType.Insert, 1, [ {
          name: 'paragraph',
          data: { text: 'abc' },
        } ]);
        const localOp = createOperation(OperationType.Insert, 0, [ {
          name: 'paragraph',
          data: { text: 'hello' },
        } ]);

        const transformedOp = receivedOp.transform(localOp);

        expect(transformedOp.index.blockIndex).toEqual(2);
      });

      it('should adjust the block index if local op is a Block operation at the same index as a received one', () => {
        const receivedOp = createOperation(OperationType.Insert, 0, [ {
          name: 'paragraph',
          data: { text: 'abc' },
        } ]);
        const localOp = createOperation(OperationType.Insert, 0, [ {
          name: 'paragraph',
          data: { text: 'hello' },
        } ]);

        const transformedOp = receivedOp.transform(localOp);

        expect(transformedOp.index.blockIndex).toEqual(1);
      });
    });

    describe('Transformation relative to Delete operation', () => {
      it('should not change a received operation if it is before a local one', () => {
        const receivedOp = createOperation(OperationType.Insert, 0, 'abc');
        const localOp = createOperation(OperationType.Delete, 3, 'def');
        const transformedOp = receivedOp.transform(localOp);

        expect(transformedOp).toEqual(receivedOp);
      });

      it('should transform an index for a received operation if it is after a local one', () => {
        const receivedOp = createOperation(OperationType.Delete, 3, 'def');
        const localOp = createOperation(OperationType.Delete, 0, 'abc');
        const transformedOp = receivedOp.transform(localOp);

        expect(transformedOp.index.textRange).toEqual([ 0, 0 ]);
      });

      it('should transform a received operation if it is at the same position as a local one', () => {
        const receivedOp = createOperation(OperationType.Modify, 3, 'abc');
        const localOp = createOperation(OperationType.Delete, 3, 'def');
        const transformedOp = receivedOp.transform(localOp);

        expect(transformedOp.index.textRange).toEqual([ 0, 0 ]);
      });

      it('should not change the text index if local op is a Block operation', () => {
        const receivedOp = createOperation(OperationType.Modify, 1, 'abc');
        const localOp = createOperation(OperationType.Delete, 0, [ {
          name: 'paragraph',
          data: { text: 'hello' },
        } ]);
        const transformedOp = receivedOp.transform(localOp);

        expect(transformedOp.index.textRange).toEqual([ 1, 1 ]);
      });

      it('should not change the text index if local op is a Block operation', () => {
        const receivedOp = createOperation(OperationType.Modify, 0, 'abc');
        const localOp = createOperation(OperationType.Insert, 0, [ {
          name: 'paragraph',
          data: { text: 'hello' },
        } ]);
        const transformedOp = receivedOp.transform(localOp);

        expect(transformedOp.index.textRange).toEqual([ 0, 0 ]);
      });

      it('should not change the operation if local op is a Block operation after a received one', () => {
        const receivedOp = createOperation(OperationType.Insert, 0, [ {
          name: 'paragraph',
          data: { text: 'abc' },
        } ]);
        const localOp = createOperation(OperationType.Delete, 1, [ {
          name: 'paragraph',
          data: { text: 'hello' },
        } ]);

        const transformedOp = receivedOp.transform(localOp);

        expect(transformedOp).toEqual(receivedOp);
      });

      it('should adjust the block index if local op is a Block operation before a received one', () => {
        const receivedOp = createOperation(OperationType.Insert, 1, [ {
          name: 'paragraph',
          data: { text: 'abc' },
        } ]);
        const localOp = createOperation(OperationType.Delete, 0, [ {
          name: 'paragraph',
          data: { text: 'hello' },
        } ]);

        const transformedOp = receivedOp.transform(localOp);

        expect(transformedOp.index.blockIndex).toEqual(0);
      });

      it('should adjust the block index if local op is a Block operation at the same index as a received one', () => {
        const receivedOp = createOperation(OperationType.Insert, 1, [ {
          name: 'paragraph',
          data: { text: 'abc' },
        } ]);
        const localOp = createOperation(OperationType.Delete, 1, [ {
          name: 'paragraph',
          data: { text: 'hello' },
        } ]);

        const transformedOp = receivedOp.transform(localOp);

        expect(transformedOp.index.blockIndex).toEqual(0);
      });
    });
  });

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

      expect(inverted.data).toEqual({ payload: { bold: false }, prevPayload: { bold: true } });
    });

    it('should throw an error if unsupported operation type is provided', () => {
      // @ts-expect-error — for test purposes
      const op = createOperation('unsupported', 0, 'def');

      expect(() => op.inverse()).toThrow('Unsupported operation type');
    });
  });
});
