import { createDataKey, DocumentId, IndexBuilder } from '@editorjs/model';
import { Operation, OperationType } from './Operation.js';
import { OperationsTransformer } from './OperationsTransformer.js';

describe('OperationsTransformer', () => {
  let transformer: OperationsTransformer;

  beforeEach(() => {
    transformer = new OperationsTransformer();
  });

  describe('transform', () => {
    it('should not transform operations on different documents', () => {
      const operation = new Operation(
        OperationType.Insert,
        new IndexBuilder().addDocumentId('doc1' as DocumentId).addBlockIndex(0).build(),
        { payload: 'test' },
        'user1',
        1
      );

      const againstOp = new Operation(
        OperationType.Insert,
        new IndexBuilder().addDocumentId('doc2' as DocumentId).addBlockIndex(0).build(),
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
            new IndexBuilder().addDocumentId('doc1' as DocumentId).addBlockIndex(2).build(),
            { payload: 'test' },
            'user1',
            1
          );

          const againstOp = new Operation(
            OperationType.Insert,
            new IndexBuilder().addDocumentId('doc1' as DocumentId).addBlockIndex(1).build(),
            { payload: 'test' },
            'user2',
            1
          );

          const result = transformer.transform(operation, againstOp);
          expect(result.index.blockIndex).toBe(3);
        });

        it('should decrease block index when transforming against Delete operation before current block', () => {
          const operation = new Operation(
            OperationType.Insert,
            new IndexBuilder().addDocumentId('doc1' as DocumentId).addBlockIndex(2).build(),
            { payload: 'test' },
            'user1',
            1
          );

          const againstOp = new Operation(
            OperationType.Delete,
            new IndexBuilder().addDocumentId('doc1' as DocumentId).addBlockIndex(1).build(),
            { payload: 'test' },
            'user2',
            1
          );

          const result = transformer.transform(operation, againstOp);
          expect(result.index.blockIndex).toBe(1);
        });

        it('should return Neutral operation when transforming against Delete operation of the same block', () => {
          const operation = new Operation(
            OperationType.Modify,
            new IndexBuilder().addDocumentId('doc1' as DocumentId).addBlockIndex(1).build(),
            { payload: 'test' },
            'user1',
            1
          );

          const againstOp = new Operation(
            OperationType.Delete,
            new IndexBuilder().addDocumentId('doc1' as DocumentId).addBlockIndex(1).build(),
            { payload: 'test' },
            'user2',
            1
          );

          const result = transformer.transform(operation, againstOp);
          expect(result.type).toBe(OperationType.Neutral);
        });
      });

      describe('Against text operations', () => {
        it('should not transform block operation against text operation', () => {
          const operation = new Operation(
            OperationType.Insert,
            new IndexBuilder().addDocumentId('doc1' as DocumentId).addBlockIndex(1).build(),
            { payload: 'test' },
            'user1',
            1
          );

          const againstOp = new Operation(
            OperationType.Insert,
            new IndexBuilder()
              .addDocumentId('doc1' as DocumentId)
              .addBlockIndex(1)
              .addDataKey(createDataKey('text'))
              .addTextRange([0, 1])
              .build(),
            { payload: 'a' },
            'user2',
            1
          );

          const result = transformer.transform(operation, againstOp);
          expect(result).toEqual(operation);
        });
      });
    });

    describe('Text operations transformation', () => {
      describe('Against text Insert operations', () => {
        it('should shift right text range when Insert is before current operation', () => {
          const operation = new Operation(
            OperationType.Insert,
            new IndexBuilder()
              .addDocumentId('doc1' as DocumentId)
              .addBlockIndex(1)
              .addDataKey(createDataKey('text'))
              .addTextRange([5, 8])
              .build(),
            { payload: 'test' },
            'user1',
            1
          );

          const againstOp = new Operation(
            OperationType.Insert,
            new IndexBuilder()
              .addDocumentId('doc1' as DocumentId)
              .addBlockIndex(1)
              .addDataKey(createDataKey('text'))
              .addTextRange([2, 2])
              .build(),
            { payload: 'abc' },
            'user2',
            1
          );

          const result = transformer.transform(operation, againstOp);
          expect(result.index.textRange).toEqual([8, 11]);
        });

        it('should extend text range when Insert is inside current operation range', () => {
          const operation = new Operation(
            OperationType.Modify,
            new IndexBuilder()
              .addDocumentId('doc1' as DocumentId)
              .addBlockIndex(1)
              .addDataKey(createDataKey('text'))
              .addTextRange([2, 8])
              .build(),
            { payload: 'test' },
            'user1',
            1
          );

          const againstOp = new Operation(
            OperationType.Insert,
            new IndexBuilder()
              .addDocumentId('doc1' as DocumentId)
              .addBlockIndex(1)
              .addDataKey(createDataKey('text'))
              .addTextRange([4, 4])
              .build(),
            { payload: 'abc' },
            'user2',
            1
          );

          const result = transformer.transform(operation, againstOp);
          expect(result.index.textRange).toEqual([2, 11]);
        });
      });

      describe('Against text Delete operations', () => {
        it('should shift text range left when Delete is before current operation', () => {
          const operation = new Operation(
            OperationType.Insert,
            new IndexBuilder()
              .addDocumentId('doc1' as DocumentId)
              .addBlockIndex(1)
              .addDataKey(createDataKey('text'))
              .addTextRange([8, 10])
              .build(),
            { payload: 'test' },
            'user1',
            1
          );

          const againstOp = new Operation(
            OperationType.Delete,
            new IndexBuilder()
              .addDocumentId('doc1' as DocumentId)
              .addBlockIndex(1)
              .addDataKey(createDataKey('text'))
              .addTextRange([2, 5])
              .build(),
            { payload: 'abc' },
            'user2',
            1
          );

          const result = transformer.transform(operation, againstOp);
          expect(result.index.textRange).toEqual([5, 7]);
        });

        it('should return Neutral operation when Delete fully covers current operation', () => {
          const operation = new Operation(
            OperationType.Modify,
            new IndexBuilder()
              .addDocumentId('doc1' as DocumentId)
              .addBlockIndex(1)
              .addDataKey(createDataKey('text'))
              .addTextRange([3, 5])
              .build(),
            { payload: 'test' },
            'user1',
            1
          );

          const againstOp = new Operation(
            OperationType.Delete,
            new IndexBuilder()
              .addDocumentId('doc1' as DocumentId)
              .addBlockIndex(1)
              .addDataKey(createDataKey('text'))
              .addTextRange([2, 8])
              .build(),
            { payload: 'abcdef' },
            'user2',
            1
          );

          const result = transformer.transform(operation, againstOp);
          expect(result.type).toBe(OperationType.Neutral);
        });
      });
    });
  });
}); 