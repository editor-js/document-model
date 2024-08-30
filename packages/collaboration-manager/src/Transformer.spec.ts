/* eslint-disable @typescript-eslint/no-magic-numbers */
import type { DataKey, DocumentIndex } from '@editorjs/model';
import { IndexBuilder } from '@editorjs/model';
import { Operation, OperationType } from './Operation.js';
import { Transformer } from './Transformer.js';

describe('Transformer', () => {
  const transformer = new Transformer();

  const createOperation = (type: OperationType, startIndex: number, value: string): Operation => {
    return new Operation(
      type,
      new IndexBuilder()
        .addBlockIndex(0)
        .addDataKey('text' as DataKey)
        .addTextRange([startIndex, startIndex])
        .build(),
      {
        prevValue: type === OperationType.Delete ? value : '',
        newValue: type === OperationType.Insert ? value : '',
      }
    );
  };

  describe('Insert vs Insert', () => {
    test('Should not change a received operation if it is before a local one', () => {
      const receivedOp = createOperation(OperationType.Insert, 0, 'abc');
      const localOp = createOperation(OperationType.Insert, 3, 'def');
      const transformedOp = transformer.transform(receivedOp, localOp);

      expect(transformedOp).toEqual(receivedOp);
    });

    test('Should adjust an index for a received operation if it is after a local one', () => {
      const receivedOp = createOperation(OperationType.Insert, 3, 'def');
      const localOp = createOperation(OperationType.Insert, 0, 'abc');
      const transformedOp = transformer.transform(receivedOp, localOp);

      expect(transformedOp.index.textRange).toEqual([6, 6]);
    });

    test('Should not change a received operation if it is at the same position as a local one', () => {
      const receivedOp = createOperation(OperationType.Insert, 0, 'abc');
      const localOp = createOperation(OperationType.Insert, 0, 'def');
      const transformedOp = transformer.transform(receivedOp, localOp);

      expect(transformedOp).toEqual(receivedOp);
    });
  });

  describe('Delete vs Delete', () => {
    test('Should not change a received operation if it is before a local one', () => {
      const receivedOp = createOperation(OperationType.Delete, 0, 'abc');
      const localOp = createOperation(OperationType.Delete, 3, 'def');
      const transformedOp = transformer.transform(receivedOp, localOp);

      expect(transformedOp).toEqual(receivedOp);
    });

    test('Should adjust an index for a received operation if it is after a local one', () => {
      const receivedOp = createOperation(OperationType.Delete, 3, 'def');
      const localOp = createOperation(OperationType.Delete, 0, 'abc');
      const transformedOp = transformer.transform(receivedOp, localOp);

      expect(transformedOp.index.textRange).toEqual([0, 0]);
    });

    test('Should adjust an index for a received operation if it is at the same position as a local one', () => {
      const receivedOp = createOperation(OperationType.Delete, 0, 'abc');
      const localOp = createOperation(OperationType.Delete, 0, 'abc');
      const transformedOp = transformer.transform(receivedOp, localOp);

      expect(transformedOp.index.textRange).toEqual([0, 0]);
    });
  });

  describe('Insert vs Delete', () => {
    test('Should not change a received operation if it is before a local one', () => {
      const receivedOp = createOperation(OperationType.Insert, 0, 'abc');
      const localOp = createOperation(OperationType.Delete, 3, 'def');
      const transformedOp = transformer.transform(receivedOp, localOp);

      expect(transformedOp).toEqual(receivedOp);
    });

    test('Should adjust an index for a received operation if it is after a local one', () => {
      const receivedOp = createOperation(OperationType.Insert, 6, 'ghi');
      const localOp = createOperation(OperationType.Delete, 0, 'abc');
      const transformedOp = transformer.transform(receivedOp, localOp);

      expect(transformedOp.index.textRange).toEqual([3, 3]);
    });

    test('Should not change a received operation if it is at the same position as a local one', () => {
      const receivedOp = createOperation(OperationType.Insert, 3, 'def');
      const localOp = createOperation(OperationType.Delete, 3, 'ghi');
      const transformedOp = transformer.transform(receivedOp, localOp);

      expect(transformedOp).toEqual(receivedOp);
    });
  });

  describe('Delete vs Insert', () => {
    test('Should not change a received operation if it is before a local one', () => {
      const receivedOp = createOperation(OperationType.Delete, 0, 'abc');
      const localOp = createOperation(OperationType.Insert, 3, 'def');
      const transformedOp = transformer.transform(receivedOp, localOp);

      expect(transformedOp).toEqual(receivedOp);
    });

    test('Should adjust an index for a received operation if it is after a local one', () => {
      const receivedOp = createOperation(OperationType.Delete, 6, 'ghi');
      const localOp = createOperation(OperationType.Insert, 0, 'abc');
      const transformedOp = transformer.transform(receivedOp, localOp);

      expect(transformedOp.index.textRange).toEqual([9, 9]);
    });

    test('Should adjust an index for a received operation if it is at the same position as a local one', () => {
      const receivedOp = createOperation(OperationType.Delete, 3, 'def');
      const localOp = createOperation(OperationType.Insert, 3, 'ghi');
      const transformedOp = transformer.transform(receivedOp, localOp);

      expect(transformedOp.index.textRange).toEqual([6, 6]);
    });
  });

  describe('Edge cases', () => {
    test('Should not change operation if document ids are different', () => {
      const receivedOp = createOperation(OperationType.Insert, 0, 'abc');
      const localOp = createOperation(OperationType.Insert, 0, 'def');

      localOp.index.documentId = 'document2' as DocumentIndex;
      const transformedOp = transformer.transform(receivedOp, localOp);

      expect(transformedOp).toEqual(receivedOp);
    });

    test('Should not change operation if blocks are different', () => {
      const receivedOp = createOperation(OperationType.Insert, 0, 'abc');
      const localOp = createOperation(OperationType.Insert, 0, 'def');

      localOp.index.blockIndex = 1;

      const transformedOp = transformer.transform(receivedOp, localOp);

      expect(transformedOp).toEqual(receivedOp);
    });

    test('Should throw an error if unsupported index type is provided', () => {
      const receivedOp = createOperation(OperationType.Insert, 0, 'def');

      receivedOp.index.textRange = undefined;
      const localOp = createOperation(OperationType.Insert, 0, 'def');

      expect(() => transformer.transform(receivedOp, localOp)).toThrow('Unsupported index');
    });

    test('Should throw an error if unsupported operation type is provided', () => {
      const receivedOp = createOperation(OperationType.Modify, 0, 'def');
      const localOp = createOperation(OperationType.Insert, 0, 'def');

      expect(() => transformer.transform(receivedOp, localOp)).toThrow('Unsupported operation type');
    });
  });
});
