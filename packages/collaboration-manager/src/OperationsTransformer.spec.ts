import type { BlockIndex, DocumentId, TextIndex } from '@editorjs/sdk';
import { createDataKey, Index } from '@editorjs/sdk';
import { Operation, OperationType } from './Operation.js';
import { OperationsTransformer } from './OperationsTransformer.js';

/* eslint-disable @typescript-eslint/no-magic-numbers */
describe('OperationsTransformer', () => {
  let transformer: OperationsTransformer;

  beforeEach(() => {
    transformer = new OperationsTransformer();
  });

  describe('transform', () => {
    const dataIndex = (blockIndex: number, dataKey: ReturnType<typeof createDataKey>): Index =>
      Index.data(blockIndex, dataKey, 'doc1' as DocumentId);

    it('should not transform operations on different documents', () => {
      const operation = new Operation(
        OperationType.Insert,
        Index.block(0, 'doc1' as DocumentId),
        { payload: 'test' },
        'user1',
        1
      );

      const againstOp = new Operation(
        OperationType.Insert,
        Index.block(0, 'doc2' as DocumentId),
        { payload: 'test' },
        'user2',
        1
      );

      const result = transformer.transform(operation, againstOp);

      expect(result).toEqual(operation);
    });

    describe('Block operations transformation', () => {
      describe('Against block operations', () => {
        it('should increase block index when transforming against Insert operation', () => {
          const operation = new Operation(
            OperationType.Insert,
            Index.block(2, 'doc1' as DocumentId),
            { payload: 'test' },
            'user1',
            1
          );

          const againstOp = new Operation(
            OperationType.Insert,
            Index.block(1, 'doc1' as DocumentId),
            { payload: 'test' },
            'user2',
            1
          );

          const result = transformer.transform(operation, againstOp);

          expect((result.index as BlockIndex).blockIndex).toBe(3);
        });

        it('should decrease block index when transforming against Delete operation before current block', () => {
          const operation = new Operation(
            OperationType.Insert,
            Index.block(2, 'doc1' as DocumentId),
            { payload: 'test' },
            'user1',
            1
          );

          const againstOp = new Operation(
            OperationType.Delete,
            Index.block(1, 'doc1' as DocumentId),
            { payload: 'test' },
            'user2',
            1
          );

          const result = transformer.transform(operation, againstOp);

          expect((result.index as BlockIndex).blockIndex).toBe(1);
        });

        it('should return Neutral operation when transforming against Delete operation of the same block', () => {
          const operation = new Operation(
            OperationType.Modify,
            Index.block(1, 'doc1' as DocumentId),
            { payload: 'test' },
            'user1',
            1
          );

          const againstOp = new Operation(
            OperationType.Delete,
            Index.block(1, 'doc1' as DocumentId),
            { payload: 'test' },
            'user2',
            1
          );

          const result = transformer.transform(operation, againstOp);

          expect(result.type).toBe(OperationType.Neutral);
        });

        it('should not change block operation when against block operation is Modify', () => {
          const operation = new Operation(
            OperationType.Insert,
            Index.block(2, 'doc1' as DocumentId),
            { payload: 'test' },
            'user1',
            1
          );

          const againstOp = new Operation(
            OperationType.Modify,
            Index.block(1, 'doc1' as DocumentId),
            { payload: 'x',
              prevPayload: null },
            'user2',
            1
          );

          const result = transformer.transform(operation, againstOp);

          expect((result.index as BlockIndex).blockIndex).toBe(2);
        });
      });

      describe('Against text operations', () => {
        it('should not transform block operation against text operation', () => {
          const operation = new Operation(
            OperationType.Insert,
            Index.block(1, 'doc1' as DocumentId),
            { payload: 'test' },
            'user1',
            1
          );

          const againstOp = new Operation(
            OperationType.Insert,
            Index.text([{ blockIndex: 1,
              dataKey: createDataKey('text'),
              textRange: [0, 1],
              documentId: 'doc1' as DocumentId }]),
            { payload: 'a' },
            'user2',
            1
          );

          const result = transformer.transform(operation, againstOp);

          expect(result).toEqual(operation);
        });
      });

      describe('Against data operations', () => {
        it('should not change block operation when against operation is data operation', () => {
          const operation = new Operation(
            OperationType.Insert,
            Index.block(1, 'doc1' as DocumentId),
            { payload: 'test' },
            'user1',
            1
          );

          const againstOp = new Operation(
            OperationType.Modify,
            dataIndex(1, createDataKey('valueA')),
            { payload: { x: true },
              prevPayload: null },
            'user2',
            undefined
          );

          const result = transformer.transform(operation, againstOp);

          expect(result).toEqual(operation);
        });
      });
    });

    describe('Text operations transformation', () => {
      describe('against data operations', () => {
        it('should not change text operation when against data op is on the same block', () => {
          const textKey = createDataKey('text');
          const operation = new Operation(
            OperationType.Insert,
            Index.text([{ blockIndex: 1,
              dataKey: textKey,
              textRange: [2, 5],
              documentId: 'doc1' as DocumentId }]),
            { payload: 'abc' },
            'user1',
            4
          );

          const againstOp = new Operation(
            OperationType.Modify,
            dataIndex(1, createDataKey('valueA')),
            { payload: { x: true },
              prevPayload: null },
            'user2',
            undefined
          );

          const result = transformer.transform(operation, againstOp);

          expect(result).toEqual(operation);
        });
      });

      describe('Against text Insert operations', () => {
        it('should shift right text range when Insert is before current operation', () => {
          const operation = new Operation(
            OperationType.Insert,
            Index.text([{ blockIndex: 1,
              dataKey: createDataKey('text'),
              textRange: [5, 8],
              documentId: 'doc1' as DocumentId }]),
            { payload: 'test' },
            'user1',
            1
          );

          const againstOp = new Operation(
            OperationType.Insert,
            Index.text([{ blockIndex: 1,
              dataKey: createDataKey('text'),
              textRange: [2, 2],
              documentId: 'doc1' as DocumentId }]),
            { payload: 'abc' },
            'user2',
            1
          );

          const result = transformer.transform(operation, againstOp);

          expect((result.index as TextIndex).textRange).toEqual([8, 11]);
        });

        it('should extend text range when Insert is inside current operation range', () => {
          const operation = new Operation(
            OperationType.Modify,
            Index.text([{ blockIndex: 1,
              dataKey: createDataKey('text'),
              textRange: [2, 8],
              documentId: 'doc1' as DocumentId }]),
            { payload: 'test' },
            'user1',
            1
          );

          const againstOp = new Operation(
            OperationType.Insert,
            Index.text([{ blockIndex: 1,
              dataKey: createDataKey('text'),
              textRange: [4, 4],
              documentId: 'doc1' as DocumentId }]),
            { payload: 'abc' },
            'user2',
            1
          );

          const result = transformer.transform(operation, againstOp);

          expect((result.index as TextIndex).textRange).toEqual([2, 11]);
        });
      });

      describe('Against text Delete operations', () => {
        it('should shift text range left when Delete is before current operation', () => {
          const operation = new Operation(
            OperationType.Insert,
            Index.text([{ blockIndex: 1,
              dataKey: createDataKey('text'),
              textRange: [8, 10],
              documentId: 'doc1' as DocumentId }]),
            { payload: 'test' },
            'user1',
            1
          );

          const againstOp = new Operation(
            OperationType.Delete,
            Index.text([{ blockIndex: 1,
              dataKey: createDataKey('text'),
              textRange: [2, 5],
              documentId: 'doc1' as DocumentId }]),
            { payload: 'abc' },
            'user2',
            1
          );

          const result = transformer.transform(operation, againstOp);

          expect((result.index as TextIndex).textRange).toEqual([5, 7]);
        });

        it('should return Neutral operation when Delete fully covers current operation', () => {
          const operation = new Operation(
            OperationType.Modify,
            Index.text([{ blockIndex: 1,
              dataKey: createDataKey('text'),
              textRange: [3, 5],
              documentId: 'doc1' as DocumentId }]),
            { payload: 'test' },
            'user1',
            1
          );

          const againstOp = new Operation(
            OperationType.Delete,
            Index.text([{ blockIndex: 1,
              dataKey: createDataKey('text'),
              textRange: [2, 8],
              documentId: 'doc1' as DocumentId }]),
            { payload: 'abcdef' },
            'user2',
            1
          );

          const result = transformer.transform(operation, againstOp);

          expect(result.type).toBe(OperationType.Neutral);
        });

        it('should apply Left intersection when delete removes the left part of the current range', () => {
          const operation = new Operation(
            OperationType.Insert,
            Index.text([{ blockIndex: 1,
              dataKey: createDataKey('text'),
              textRange: [8, 10],
              documentId: 'doc1' as DocumentId }]),
            { payload: 'ab' },
            'user1',
            1
          );

          const againstOp = new Operation(
            OperationType.Delete,
            Index.text([{ blockIndex: 1,
              dataKey: createDataKey('text'),
              textRange: [5, 9],
              documentId: 'doc1' as DocumentId }]),
            { payload: 'xxxx' },
            'user2',
            1
          );

          const result = transformer.transform(operation, againstOp);

          expect((result.index as TextIndex).textRange).toEqual([5, 6]);
        });

        it('should apply Right intersection when delete removes the right part of the current range', () => {
          const operation = new Operation(
            OperationType.Insert,
            Index.text([{ blockIndex: 1,
              dataKey: createDataKey('text'),
              textRange: [5, 8],
              documentId: 'doc1' as DocumentId }]),
            { payload: 'abc' },
            'user1',
            1
          );

          const againstOp = new Operation(
            OperationType.Delete,
            Index.text([{ blockIndex: 1,
              dataKey: createDataKey('text'),
              textRange: [7, 11],
              documentId: 'doc1' as DocumentId }]),
            { payload: 'abcd' },
            'user2',
            1
          );

          const result = transformer.transform(operation, againstOp);

          expect((result.index as TextIndex).textRange).toEqual([5, 7]);
          expect(result.data.payload).toEqual('ab');
        });

        it('should shrink range when delete is strictly inside the current text range', () => {
          const operation = new Operation(
            OperationType.Modify,
            Index.text([{ blockIndex: 1,
              dataKey: createDataKey('text'),
              textRange: [4, 14],
              documentId: 'doc1' as DocumentId }]),
            { payload: { tool: 'bold' } },
            'user1',
            1
          );

          const againstOp = new Operation(
            OperationType.Delete,
            Index.text([{ blockIndex: 1,
              dataKey: createDataKey('text'),
              textRange: [6, 9],
              documentId: 'doc1' as DocumentId }]),
            { payload: 'abc' },
            'user2',
            1
          );

          const result = transformer.transform(operation, againstOp);

          expect((result.index as TextIndex).textRange).toEqual([4, 11]);
        });
      });

      describe('Against text Modify operations', () => {
        it('should leave text operation unchanged when against operation is Modify', () => {
          const operation = new Operation(
            OperationType.Insert,
            Index.text([{ blockIndex: 1,
              dataKey: createDataKey('text'),
              textRange: [2, 5],
              documentId: 'doc1' as DocumentId }]),
            { payload: 'abc' },
            'user1',
            1
          );

          const againstOp = new Operation(
            OperationType.Modify,
            Index.text([{ blockIndex: 1,
              dataKey: createDataKey('text'),
              textRange: [3, 4],
              documentId: 'doc1' as DocumentId }]),
            { payload: { tool: 'bold' },
              prevPayload: null },
            'user2',
            1
          );

          const result = transformer.transform(operation, againstOp);

          expect(result.type).toBe(operation.type);
          expect((result.index as TextIndex).textRange).toEqual((operation.index as TextIndex).textRange);
          expect(result.data).toEqual(operation.data);
        });
      });
    });

    describe('Data operations transformation', () => {
      const dataKeyA = createDataKey('valueA');
      const dataKeyB = createDataKey('valueB');

      describe('Against data (value) operations', () => {
        it('should leave operation unchanged when against data op targets a different block', () => {
          const operation = new Operation(
            OperationType.Modify,
            dataIndex(2, dataKeyA),
            { payload: { n: 1 },
              prevPayload: null },
            'user1',
            3
          );

          const againstOp = new Operation(
            OperationType.Modify,
            dataIndex(1, dataKeyA),
            { payload: { n: 2 },
              prevPayload: null },
            'user2',
            undefined
          );

          const result = transformer.transform(operation, againstOp);

          expect(result).toEqual(operation);
        });

        it('should leave operation unchanged when against data op targets a different data key', () => {
          const operation = new Operation(
            OperationType.Modify,
            dataIndex(1, dataKeyA),
            { payload: { n: 1 },
              prevPayload: null },
            'user1',
            3
          );

          const againstOp = new Operation(
            OperationType.Modify,
            dataIndex(1, dataKeyB),
            { payload: { n: 2 },
              prevPayload: null },
            'user2',
            undefined
          );

          const result = transformer.transform(operation, againstOp);

          expect(result).toEqual(operation);
        });

        it('should return Neutral when same block and data key and against op has no revision', () => {
          const index = dataIndex(1, dataKeyA);
          const operation = new Operation(
            OperationType.Modify,
            index,
            { payload: { n: 1 },
              prevPayload: null },
            'user1',
            3
          );

          const againstOp = new Operation(
            OperationType.Modify,
            index,
            { payload: { n: 2 },
              prevPayload: null },
            'user2',
            undefined
          );

          const result = transformer.transform(operation, againstOp);

          expect(result.type).toBe(OperationType.Neutral);
        });

        it('should leave operation unchanged when same block and data key and against op has revision', () => {
          const index = dataIndex(1, dataKeyA);
          const operation = new Operation(
            OperationType.Modify,
            index,
            { payload: { n: 1 },
              prevPayload: null },
            'user1',
            3
          );

          const againstOp = new Operation(
            OperationType.Modify,
            index,
            { payload: { n: 2 },
              prevPayload: null },
            'user2',
            3
          );

          const result = transformer.transform(operation, againstOp);

          expect(result).toEqual(operation);
        });
      });
    });
  });
});
