/* eslint-disable @typescript-eslint/no-magic-numbers */
import { createDataKey, IndexBuilder } from '@editorjs/model';
import { EditorJSModel } from '@editorjs/model';
import { CollaborationManager } from './CollaborationManager.js';
import { Operation, OperationType } from './Operation.js';

describe('CollaborationManager', () => {
  it('should add text on apply Insert Operation', () => {
    const model = new EditorJSModel({
      blocks: [ {
        name: 'paragraph',
        data: {
          text: {
            value: '',
            $t: 't',
          },
        },
      } ],
    });
    const collaborationManager = new CollaborationManager(model);
    const index = new IndexBuilder().addBlockIndex(0)
      .addDataKey(createDataKey('text'))
      .addTextRange([0, 4])
      .build();
    const operation = new Operation(OperationType.Insert, index, {
      prevValue: '',
      newValue: 'test',
    });

    collaborationManager.applyOperation(operation);
    expect(model.serialized).toStrictEqual({
      blocks: [ {
        name: 'paragraph',
        tunes: {},
        data: {
          text: {
            $t: 't',
            value: 'test',
            fragments: [],
          },
        },
      } ],
      properties: {},
    });
  });


  it('should remove text on apply Remove Operation', () => {
    const model = new EditorJSModel({
      blocks: [ {
        name: 'paragraph',
        data: {
          text: {
            value: 'hel11lo',
            $t: 't',
          },
        },
      } ],
    });
    const collaborationManager = new CollaborationManager(model);
    const index = new IndexBuilder().addBlockIndex(0)
      .addDataKey(createDataKey('text'))
      .addTextRange([
        3, 5])
      .build();
    const operation = new Operation(OperationType.Delete, index, {
      prevValue: '11',
      newValue: '',
    });

    collaborationManager.applyOperation(operation);
    expect(model.serialized).toStrictEqual({
      blocks: [ {
        name: 'paragraph',
        tunes: {},
        data: {
          text: {
            $t: 't',
            value: 'hello',
            fragments: [],
          },
        },
      } ],
      properties: {},
    });
  });
});
