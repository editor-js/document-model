/* eslint-disable @typescript-eslint/no-magic-numbers */
import { beforeEach, describe } from '@jest/globals';
import { EditorJSModel } from './EditorJSModel.js';
import { createDataKey, IndexBuilder } from './entities/index.js';
import type { DocumentId } from './EventBus/index';

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
      'moveBlock',
      'getText',
      'insertText',
      'removeText',
      'format',
      'unformat',
      'getFragments',
      'createCaret',
      'updateCaret',
      'removeCaret',
      'devModeGetDocument',
    ];
    const ownProperties = Object.getOwnPropertyNames(EditorJSModel.prototype);

    expect(ownProperties.sort()).toEqual(allowedMethods.sort());
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
        [ {
          name: 'paragraph',
          data: {
            text: {
              $t: 't',
              value: '',
            },
          },
        } ]
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
        [ {
          name: 'paragraph',
          data: {
            text: {
              $t: 't',
              value: '',
            },
          },
        } ]
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
        [ {
          name: 'paragraph',
          data: {
            text: {
              $t: 't',
              value: '',
            },
          },
        } ]
      );

      expect(caret.index!.blockIndex).toEqual(1);
    });
  });
});
