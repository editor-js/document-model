/* eslint-disable @typescript-eslint/no-magic-numbers */
import { beforeEach, describe } from '@jest/globals';
import { EditorJSModel } from './EditorJSModel.js';
import { createDataKey, IndexBuilder } from './entities/index.js';
import type { DocumentId } from './EventBus/index.js';
import type { BlockId } from './entities/BlockNode/index.js';

describe('EditorJSModel', () => {
  it('should expose only the public API', () => {
    const allowedMethods = [
      'constructor',
      'length',
      'serialized',
      'properties',
      'getProperty',
      'initializeDocument',
      'setProperty',
      'addBlock',
      'insertData',
      'removeData',
      'modifyData',
      'updateTuneData',
      'updateValue',
      'removeBlock',
      'clearBlocks',
      'createDataNode',
      'removeDataNode',
      'getText',
      'insertText',
      'removeText',
      'format',
      'getCaret',
      'getDataNode',
      'unformat',
      'getFragments',
      'createCaret',
      'updateCaret',
      'removeCaret',
      'devModeGetDocument',
      'getBlockId',
      'getBlockIndexById',
      'getBlockSerialized',
      'getBlockTextContent',
      'resolveBlockIndex',
    ];
    const ownProperties = Object.getOwnPropertyNames(EditorJSModel.prototype);

    expect(ownProperties.sort()).toEqual(allowedMethods.sort());
  });

  describe('.getBlockId()', () => {
    const userId = 'user';
    const documentId = 'doc';
    let model: EditorJSModel;

    beforeEach(() => {
      model = new EditorJSModel(userId, { identifier: documentId as DocumentId });
      model.initializeDocument({
        blocks: [
          { name: 'paragraph',
            data: {} },
          { name: 'header',
            data: {} },
        ],
      });
    });

    it('should return the block id for a valid index', () => {
      const id = model.getBlockId(0);

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });

    it('should return different ids for different blocks', () => {
      const id0 = model.getBlockId(0);
      const id1 = model.getBlockId(1);

      expect(id0).not.toBe(id1);
    });

    it('should return undefined for a negative index', () => {
      expect(model.getBlockId(-1)).toBeUndefined();
    });

    it('should return undefined for an index equal to the document length', () => {
      expect(model.getBlockId(2)).toBeUndefined();
    });

    it('should return undefined for an index greater than the document length', () => {
      expect(model.getBlockId(99)).toBeUndefined();
    });
  });

  describe('.getBlockIndexById()', () => {
    const userId = 'user';
    const documentId = 'doc';
    let model: EditorJSModel;

    beforeEach(() => {
      model = new EditorJSModel(userId, { identifier: documentId as DocumentId });
      model.initializeDocument({
        blocks: [
          { name: 'paragraph',
            data: {} },
          { name: 'header',
            data: {} },
        ],
      });
    });

    it('should return the correct index for the first block', () => {
      const id = model.getBlockId(0) as BlockId;

      expect(model.getBlockIndexById(id)).toBe(0);
    });

    it('should return the correct index for a non-first block', () => {
      const id = model.getBlockId(1) as BlockId;

      expect(model.getBlockIndexById(id)).toBe(1);
    });

    it('should return -1 for a non-existent id', () => {
      expect(model.getBlockIndexById('non-existent-id')).toBe(-1);
    });
  });

  describe('.getBlockSerialized()', () => {
    const userId = 'user';
    const documentId = 'doc';
    let model: EditorJSModel;

    beforeEach(() => {
      model = new EditorJSModel(userId, { identifier: documentId as DocumentId });
      model.initializeDocument({
        blocks: [
          { name: 'paragraph',
            data: {} },
          { name: 'header',
            data: {} },
        ],
      });
    });

    it('should return serialized block at the specified index', () => {
      const serialized = model.getBlockSerialized(0);

      expect(serialized).toMatchObject({ name: 'paragraph' });
    });

    it('should return the correct block when second index is specified', () => {
      const serialized = model.getBlockSerialized(1);

      expect(serialized).toMatchObject({ name: 'header' });
    });

    it('should include id in the serialized block', () => {
      const serialized = model.getBlockSerialized(0);

      expect(serialized.id).toBeDefined();
    });

    it('should return serialized block when addressed by BlockId', () => {
      const id = model.getBlockId(1) as BlockId;
      const serialized = model.getBlockSerialized(id);

      expect(serialized).toMatchObject({ name: 'header' });
      expect(serialized.id).toBe(id);
    });
  });

  describe('.getCaret()', () => {
    const userId = 'user';
    const documentId = 'doc';
    let model: EditorJSModel;

    beforeEach(() => {
      model = new EditorJSModel(userId, { identifier: documentId as DocumentId });
      model.initializeDocument({
        blocks: [
          {
            name: 'paragraph',
            data: { text: { $t: 't',
              value: '' } },
          },
        ],
      });
    });

    it('should return undefined when no caret has been created for the user', () => {
      expect(model.getCaret(userId)).toBeUndefined();
    });

    it('should return the caret after it has been created', () => {
      const index = new IndexBuilder()
        .addDocumentId(documentId as DocumentId)
        .addBlockIndex(0)
        .build();

      model.createCaret(userId, index);

      expect(model.getCaret(userId)).toBeDefined();
    });

    it('should return undefined for a different user id than the one that created the caret', () => {
      const index = new IndexBuilder()
        .addDocumentId(documentId as DocumentId)
        .addBlockIndex(0)
        .build();

      model.createCaret(userId, index);

      expect(model.getCaret('someone-else')).toBeUndefined();
    });
  });

  describe('.getDataNode()', () => {
    const userId = 'user';
    const documentId = 'doc';
    let model: EditorJSModel;

    beforeEach(() => {
      model = new EditorJSModel(userId, { identifier: documentId as DocumentId });
      model.initializeDocument({
        blocks: [
          {
            name: 'paragraph',
            data: {
              text: { $t: 't',
                value: 'hello' },
            },
          },
        ],
      });
    });

    it('should return the serialized data node for the specified block index and key', async () => {
      // DataNodeAdded events are queued as microtasks, flush before asserting
      await Promise.resolve();

      const node = model.getDataNode(0, 'text');

      expect(node).toBeDefined();
    });

    it('should return undefined for a non-existent key', async () => {
      await Promise.resolve();

      const node = model.getDataNode(0, 'nonexistent');

      expect(node).toBeUndefined();
    });
  });

  describe('Caret updates on remote operations', () => {
    const currentUserId = 'currentUser';
    const remoteUserId = 'remoteUser';
    const documentId = 'document';
    const blocks = [
      {
        name: 'paragraph',
        data: {
          text: {
            $t: 't',
            value: 'editorjs',
          },
        },
      },
      {
        name: 'paragraph',
        data: {
          text: {
            $t: 't',
            value: 'editorjs',
          },
        },
      },
    ];
    const currentCaretIndex = new IndexBuilder()
      .addDocumentId(documentId as DocumentId)
      .addBlockIndex(1)
      .addDataKey(createDataKey('text'))
      .addTextRange([3, 3])
      .build();
    const remoteOperationIndex = new IndexBuilder()
      .from(currentCaretIndex)
      .addTextRange([0, 0])
      .build();

    let model: EditorJSModel;

    beforeEach(() => {
      model = new EditorJSModel(currentUserId, {
        identifier: documentId,
      });

      model.initializeDocument({ blocks });
    });

    it('should update user caret on remote text insert operation happened before caret', () => {
      const caret = model.createCaret(currentUserId, currentCaretIndex);

      model.insertData(remoteUserId, remoteOperationIndex, 'a');

      expect(caret.index!.textRange).toEqual([4, 4]);
    });

    it('should update user caret on remote text delete operation happened before caret', () => {
      const caret = model.createCaret(currentUserId, currentCaretIndex);

      model.removeData(remoteUserId, remoteOperationIndex, 'e');

      expect(caret.index!.textRange).toEqual([2, 2]);
    });

    it('should not update caret if remote operation happened after caret', () => {
      const caret = model.createCaret(currentUserId, currentCaretIndex);

      model.removeData(
        remoteUserId,
        new IndexBuilder()
          .from(remoteOperationIndex)
          .addTextRange([4, 5])
          .build(),
        'e'
      );

      expect(caret.index!.textRange).toEqual([3, 3]);
    });

    it('should update user caret on remote block insert operation happened before caret', () => {
      const caret = model.createCaret(currentUserId, currentCaretIndex);

      model.insertData(
        remoteUserId,
        new IndexBuilder()
          .from(remoteOperationIndex)
          .addBlockIndex(0)
          .addDataKey(undefined)
          .addTextRange(undefined)
          .build(),
        [{
          name: 'paragraph',
          data: {
            text: {
              $t: 't',
              value: '',
            },
          },
        }]
      );

      expect(caret.index!.blockIndex).toEqual(2);
    });

    it('should update user caret on remote block delete operation happened before caret', () => {
      const caret = model.createCaret(currentUserId, currentCaretIndex);

      model.removeData(
        remoteUserId,
        new IndexBuilder()
          .from(remoteOperationIndex)
          .addBlockIndex(0)
          .addDataKey(undefined)
          .addTextRange(undefined)
          .build(),
        [{
          name: 'paragraph',
          data: {
            text: {
              $t: 't',
              value: '',
            },
          },
        }]
      );

      expect(caret.index!.blockIndex).toEqual(0);
    });

    it('should not update user caret on remote block operation happened after caret', () => {
      const caret = model.createCaret(currentUserId, currentCaretIndex);

      model.removeData(
        remoteUserId,
        new IndexBuilder()
          .from(remoteOperationIndex)
          .addBlockIndex(1)
          .addDataKey(undefined)
          .addTextRange(undefined)
          .build(),
        [{
          name: 'paragraph',
          data: {
            text: {
              $t: 't',
              value: '',
            },
          },
        }]
      );

      expect(caret.index!.blockIndex).toEqual(1);
    });
  });
});
