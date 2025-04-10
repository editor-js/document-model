/* eslint-disable @typescript-eslint/no-magic-numbers */
import { Operation, OperationType, type OperationTypeToData } from '@editorjs/collaboration-manager';
import { IndexBuilder } from '@editorjs/model';
import { DocumentManager } from './DocumentManager.js';

// eslint-disable-next-line jsdoc/require-param
/**
 * Helper function to create an operation
 */
function createOperation<T extends OperationType>(
  type: T,
  index: string,
  data: OperationTypeToData<T>,
  userId: string | number,
  rev: number
): Operation<T> {
  return new Operation(
    type,
    new IndexBuilder().from(JSON.stringify(index))
      .build(),
    data,
    userId,
    rev
  );
}

describe('DocumentManager', () => {
  it('should process consequential operations', () => {
    const manager = new DocumentManager('document');

    manager.process(
      createOperation(
        OperationType.Insert,
        'doc@0:block@0',
        {
          payload: [{
            name: 'paragraph',
            data: {
              text: {
                $t: 't',
                value: '',
                fragments: [],
              },
            },
          }],
        },
        'user',
        0
      )
    );
    manager.process(
      createOperation(
        OperationType.Insert,
        'doc@0:block@0:data@text:[0,0]',
        { payload: 'A' },
        'user',
        1
      )
    );
    manager.process(
      createOperation(
        OperationType.Insert,
        'doc@0:block@0:data@text:[0,0]',
        { payload: 'A' },
        'user',
        2
      )
    );
    manager.process(
      createOperation(
        OperationType.Insert,
        'doc@0:block@0:data@text:[0,0]',
        { payload: 'A' },
        'user',
        3
      )
    );

    expect(manager.currentModelState()).toEqual({
      identifier: 'document',
      blocks: [
        {
          name: 'paragraph',
          tunes: {},
          data: {
            text: {
              $t: 't',
              value: 'AAA',
              fragments: [],
            },
          },
        },
      ],
      properties: {},
    });
  });

  it('should process concurrent operations', () => {
    const manager = new DocumentManager('document');

    manager.process(
      createOperation(
        OperationType.Insert,
        'doc@0:block@0',
        {
          payload: [{
            name: 'paragraph',
            data: {
              text: {
                $t: 't',
                value: '',
                fragments: [],
              },
            },
          }],
        },
        'user',
        0
      )
    );
    manager.process(
      createOperation(
        OperationType.Insert,
        'doc@0:block@0:data@text:[0,0]',
        { payload: 'A' },
        'user',
        1
      )
    );
    manager.process(
      createOperation(
        OperationType.Insert,
        'doc@0:block@0:data@text:[0,0]',
        { payload: 'B' },
        'user',
        1
      )
    );

    expect(manager.currentModelState()).toEqual({
      identifier: 'document',
      blocks: [
        {
          name: 'paragraph',
          tunes: {},
          data: {
            text: {
              $t: 't',
              value: 'AB',
              fragments: [],
            },
          },
        },
      ],
      properties: {},
    });
  });

  it('should process older operations', () => {
    const manager = new DocumentManager('document');

    manager.process(
      createOperation(
        OperationType.Insert,
        'doc@0:block@0',
        {
          payload: [{
            name: 'paragraph',
            data: {
              text: {
                $t: 't',
                value: '',
                fragments: [],
              },
            },
          }],
        },
        'user',
        0
      )
    );
    manager.process(
      createOperation(
        OperationType.Insert,
        'doc@0:block@0:data@text:[0,0]',
        { payload: 'A' },
        'user',
        1
      )
    );
    manager.process(
      createOperation(
        OperationType.Insert,
        'doc@0:block@0:data@text:[0,0]',
        { payload: 'A' },
        'user',
        2
      )
    );
    manager.process(
      createOperation(
        OperationType.Insert,
        'doc@0:block@0:data@text:[0,0]',
        { payload: 'B' },
        'user',
        1
      )
    );

    expect(manager.currentModelState()).toEqual({
      identifier: 'document',
      blocks: [
        {
          name: 'paragraph',
          tunes: {},
          data: {
            text: {
              $t: 't',
              value: 'AAB',
              fragments: [],
            },
          },
        },
      ],
      properties: {},
    });
  });
});
