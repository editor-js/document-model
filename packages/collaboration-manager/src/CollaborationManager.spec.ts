/* eslint-disable @typescript-eslint/no-magic-numbers */
import { createDataKey, IndexBuilder } from '@editorjs/model';
import { EditorJSModel } from '@editorjs/model';
import type { CoreConfig } from '@editorjs/sdk';
import { beforeAll, jest } from '@jest/globals';
import { BatchedOperation } from './BatchedOperation.js';
import { CollaborationManager } from './CollaborationManager.js';
import { Operation, OperationType } from './Operation.js';
import { UndoRedoManager } from './UndoRedoManager.js';

const userId = 'user';
const remoteUserId = 'remote-user';
const documentId = 'document';

const config: CoreConfig = {
  userId,
  documentId: documentId,
};

const remoteConfig: CoreConfig = {
  userId: remoteUserId,
  documentId: documentId,
};

describe('CollaborationManager', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  describe('applyOperation', () => {
    it('should throw an error on unknown operation type', () => {
      const model = new EditorJSModel(userId, { identifier: documentId });

      const collaborationManager = new CollaborationManager(config as Required<CoreConfig>, model);

      // @ts-expect-error - for test purposes
      expect(() => collaborationManager.applyOperation(new Operation('unknown', new IndexBuilder().build(), 'hello'))).toThrow('Unknown operation type');
    });

    it('should add text on apply Insert Operation', () => {
      const model = new EditorJSModel(userId, { identifier: documentId });

      model.initializeDocument({
        blocks: [{
          name: 'paragraph',
          data: {
            text: {
              value: '',
              $t: 't',
            },
          },
        }],
      });
      const collaborationManager = new CollaborationManager(config as Required<CoreConfig>, model);
      const index = new IndexBuilder().addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([0, 4])
        .build();
      const operation = new Operation(OperationType.Insert, index, {
        payload: 'test',
      }, userId);

      collaborationManager.applyOperation(operation);
      expect(model.serialized).toStrictEqual({
        identifier: documentId,
        blocks: [{
          name: 'paragraph',
          tunes: {},
          data: {
            text: {
              $t: 't',
              value: 'test',
              fragments: [],
            },
          },
        }],
        properties: {},
      });
    });

    it('should remove text on apply Remove Operation', () => {
      const model = new EditorJSModel(userId, { identifier: documentId });

      model.initializeDocument({
        blocks: [{
          name: 'paragraph',
          data: {
            text: {
              value: 'hel11lo',
              $t: 't',
            },
          },
        }],
      });
      const collaborationManager = new CollaborationManager(config as Required<CoreConfig>, model);
      const index = new IndexBuilder().addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([3, 5])
        .build();
      const operation = new Operation(OperationType.Delete, index, {
        payload: '11',
      }, userId);

      collaborationManager.applyOperation(operation);
      expect(model.serialized).toStrictEqual({
        identifier: documentId,
        blocks: [{
          name: 'paragraph',
          tunes: {},
          data: {
            text: {
              $t: 't',
              value: 'hello',
              fragments: [],
            },
          },
        }],
        properties: {},
      });
    });

    it('should add Block on apply Insert Operation', () => {
      const model = new EditorJSModel(userId, { identifier: documentId });

      model.initializeDocument({
        blocks: [],
      });
      const collaborationManager = new CollaborationManager(config as Required<CoreConfig>, model);
      const index = new IndexBuilder().addBlockIndex(0)
        .build();
      const operation = new Operation(OperationType.Insert, index, {
        payload: [{
          name: 'paragraph',
          data: {
            text: {
              value: 'hello',
              $t: 't',
            },
          },
        }],
      }, userId);

      collaborationManager.applyOperation(operation);
      expect(model.serialized).toStrictEqual({
        identifier: documentId,
        blocks: [{
          name: 'paragraph',
          tunes: {},
          data: {
            text: {
              $t: 't',
              value: 'hello',
              fragments: [],
            },
          },
        }],
        properties: {},
      });
    });

    it('should remove Block on apply Delete Operation', () => {
      const model = new EditorJSModel(userId, { identifier: documentId });
      const block = {
        name: 'paragraph',
        data: {
          text: {
            value: 'hello',
            $t: 't',
          },
        },
      };

      model.initializeDocument({
        blocks: [block],
      });
      const collaborationManager = new CollaborationManager(config as Required<CoreConfig>, model);
      const index = new IndexBuilder().addBlockIndex(0)
        .build();
      const operation = new Operation(OperationType.Delete, index, {
        payload: [block],
      }, userId);

      collaborationManager.applyOperation(operation);
      expect(model.serialized).toStrictEqual({
        identifier: documentId,
        blocks: [],
        properties: {},
      });
    });

    it('should format text on apply Modify Operation', () => {
      const model = new EditorJSModel(userId, { identifier: documentId });

      model.initializeDocument({
        blocks: [{
          name: 'paragraph',
          data: {
            text: {
              value: 'Hello world',
              $t: 't',
            },
          },
        }],
      });
      const collaborationManager = new CollaborationManager(config as Required<CoreConfig>, model);
      const index = new IndexBuilder().addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([0, 5])
        .build();
      const operation = new Operation(OperationType.Modify, index, {
        payload: {
          tool: 'bold',
        },
        prevPayload: null,
      }, userId);

      collaborationManager.applyOperation(operation);
      expect(model.serialized).toStrictEqual({
        identifier: documentId,
        blocks: [{
          name: 'paragraph',
          tunes: {},
          data: {
            text: {
              $t: 't',
              value: 'Hello world',
              fragments: [{
                tool: 'bold',
                range: [0, 5],
              }],
            },
          },
        }],
        properties: {},
      });
    });

    it('should not change the model when applying Neutral operation', () => {
      const model = new EditorJSModel(userId, { identifier: documentId });

      model.initializeDocument({
        blocks: [{
          name: 'paragraph',
          data: {
            text: {
              value: 'hello',
              $t: 't',
            },
          },
        }],
      });
      const collaborationManager = new CollaborationManager(config as Required<CoreConfig>, model);
      const index = new IndexBuilder().addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([0, 5])
        .build();
      const operation = new Operation(OperationType.Neutral, index, {
        payload: [],
      }, userId);

      const before = model.serialized;

      collaborationManager.applyOperation(operation);

      expect(model.serialized).toStrictEqual(before);
    });

    it('should apply every operation when applying BatchedOperation', () => {
      const model = new EditorJSModel(userId, { identifier: documentId });

      model.initializeDocument({
        blocks: [{
          name: 'paragraph',
          data: {
            text: {
              value: '',
              $t: 't',
            },
          },
        }],
      });
      const collaborationManager = new CollaborationManager(config as Required<CoreConfig>, model);
      const op1 = new Operation(OperationType.Insert, new IndexBuilder().addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([0, 0])
        .build(), { payload: 'a' }, userId);
      const op2 = new Operation(OperationType.Insert, new IndexBuilder().addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([1, 1])
        .build(), { payload: 'b' }, userId);
      const batch = new BatchedOperation(op1);

      batch.add(op2);

      collaborationManager.applyOperation(batch);

      expect(model.serialized).toStrictEqual({
        identifier: documentId,
        blocks: [{
          name: 'paragraph',
          tunes: {},
          data: {
            text: {
              $t: 't',
              value: 'ab',
              fragments: [],
            },
          },
        }],
        properties: {},
      });
    });

    it('should unformat text on apply Modify Operation', () => {
      const model = new EditorJSModel(userId, { identifier: documentId });

      model.initializeDocument({
        blocks: [{
          name: 'paragraph',
          data: {
            text: {
              value: 'Hello world',
              $t: 't',
              fragments: [{
                tool: 'bold',
                range: [0, 5],
              }],
            },
          },
        }],
      });
      const collaborationManager = new CollaborationManager(config as Required<CoreConfig>, model);
      const index = new IndexBuilder().addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([0, 3])
        .build();
      const operation = new Operation(OperationType.Modify, index, {
        payload: null,
        prevPayload: {
          tool: 'bold',
        },
      }, userId);

      collaborationManager.applyOperation(operation);
      expect(model.serialized).toStrictEqual({
        identifier: documentId,
        blocks: [{
          name: 'paragraph',
          tunes: {},
          data: {
            text: {
              $t: 't',
              value: 'Hello world',
              fragments: [{
                tool: 'bold',
                range: [3, 5],
              }],
            },
          },
        }],
        properties: {},
      });
    });
  });

  describe('undo logic', () => {
    beforeAll(() => {
      jest.useFakeTimers();
    });

    it('should invert Insert operation', () => {
      const model = new EditorJSModel(userId, { identifier: documentId });

      model.initializeDocument({
        blocks: [{
          name: 'paragraph',
          data: {
            text: {
              value: '',
              $t: 't',
            },
          },
        }],
      });
      const collaborationManager = new CollaborationManager(config as Required<CoreConfig>, model);
      const index = new IndexBuilder().addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([0, 4])
        .build();
      const operation = new Operation(OperationType.Insert, index, {
        payload: 'test',
      }, userId);

      collaborationManager.applyOperation(operation);
      collaborationManager.undo();
      expect(model.serialized).toStrictEqual({
        identifier: documentId,
        blocks: [{
          name: 'paragraph',
          tunes: {},
          data: {
            text: {
              $t: 't',
              value: '',
              fragments: [],
            },
          },
        }],
        properties: {},
      });
    });

    it('should invert Remove operation', () => {
      const model = new EditorJSModel(userId, { identifier: documentId });

      model.initializeDocument({
        blocks: [{
          name: 'paragraph',
          data: {
            text: {
              value: 'hel11lo',
              $t: 't',
            },
          },
        }],
      });
      const collaborationManager = new CollaborationManager(config as Required<CoreConfig>, model);
      const index = new IndexBuilder().addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([
          3, 5])
        .build();
      const operation = new Operation(OperationType.Delete, index, {
        payload: '11',
      }, userId);

      collaborationManager.applyOperation(operation);
      collaborationManager.undo();
      expect(model.serialized).toStrictEqual({
        identifier: documentId,
        blocks: [{
          name: 'paragraph',
          tunes: {},
          data: {
            text: {
              $t: 't',
              value: 'hel11lo',
              fragments: [],
            },
          },
        }],
        properties: {},
      });
    });

    it('should revert only one operation if stack length is 1', () => {
      const model = new EditorJSModel(userId, { identifier: documentId });

      model.initializeDocument({
        blocks: [{
          name: 'paragraph',
          data: {
            text: {
              value: '',
              $t: 't',
            },
          },
        }],
      });
      const collaborationManager = new CollaborationManager(config as Required<CoreConfig>, model);
      const index = new IndexBuilder().addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([0, 4])
        .build();
      const operation = new Operation(OperationType.Insert, index, {
        payload: 'test',
      }, userId);

      collaborationManager.applyOperation(operation);
      collaborationManager.undo();
      collaborationManager.undo();
      expect(model.serialized).toStrictEqual({
        identifier: documentId,
        blocks: [{
          name: 'paragraph',
          tunes: {},
          data: {
            text: {
              $t: 't',
              value: '',
              fragments: [],
            },
          },
        }],
        properties: {},
      });
    });

    it('should revert back to original state after undo and redo operations', () => {
      const model = new EditorJSModel(userId, { identifier: documentId });

      model.initializeDocument({
        blocks: [{
          name: 'paragraph',
          data: {
            text: {
              value: '',
              $t: 't',
            },
          },
        }],
      });
      const collaborationManager = new CollaborationManager(config as Required<CoreConfig>, model);
      const index = new IndexBuilder().addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([0, 4])
        .build();
      const operation = new Operation(OperationType.Insert, index, {
        payload: 'test',
      }, userId);

      collaborationManager.applyOperation(operation);
      collaborationManager.undo();
      collaborationManager.redo();

      expect(model.serialized).toStrictEqual({
        identifier: documentId,
        blocks: [{
          name: 'paragraph',
          tunes: {},
          data: {
            text: {
              $t: 't',
              value: 'test',
              fragments: [],
            },
          },
        }],
        properties: {},
      });
    });

    it('should undo block insert', () => {
      const model = new EditorJSModel(userId, { identifier: documentId });

      model.initializeDocument({
        blocks: [],
      });
      const collaborationManager = new CollaborationManager(config as Required<CoreConfig>, model);
      const index = new IndexBuilder().addBlockIndex(0)
        .build();
      const operation = new Operation(OperationType.Insert, index, {
        payload: [{
          name: 'paragraph',
          data: {
            text: {
              value: 'hello',
              $t: 't',
            },
          },
        }],
      }, userId);

      collaborationManager.applyOperation(operation);

      collaborationManager.undo();

      expect(model.serialized).toStrictEqual({
        identifier: documentId,
        blocks: [],
        properties: {},
      });
    });

    it('should undo text formatting', () => {
      const model = new EditorJSModel(userId, { identifier: documentId });

      model.initializeDocument({
        blocks: [{
          name: 'paragraph',
          data: {
            text: {
              value: 'Hello world',
              $t: 't',
            },
          },
        }],
      });
      const collaborationManager = new CollaborationManager(config as Required<CoreConfig>, model);
      const index = new IndexBuilder().addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([0, 5])
        .build();
      const operation = new Operation(OperationType.Modify, index, {
        payload: {
          tool: 'bold',
        },
        prevPayload: null,
      }, userId);

      collaborationManager.applyOperation(operation);
      collaborationManager.undo();

      expect(model.serialized).toStrictEqual({
        identifier: documentId,
        blocks: [{
          name: 'paragraph',
          tunes: {},
          data: {
            text: {
              $t: 't',
              value: 'Hello world',
              fragments: [],
            },
          },
        }],
        properties: {},
      });
    });

    it('should undo text unformatting', () => {
      const model = new EditorJSModel(userId, { identifier: documentId });

      model.initializeDocument({
        blocks: [{
          name: 'paragraph',
          data: {
            text: {
              value: 'Hello world',
              $t: 't',
              fragments: [{
                tool: 'bold',
                range: [0, 5],
              }],
            },
          },
        }],
      });
      const collaborationManager = new CollaborationManager(config as Required<CoreConfig>, model);
      const index = new IndexBuilder().addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([0, 3])
        .build();
      const operation = new Operation(OperationType.Modify, index, {
        payload: null,
        prevPayload: {
          tool: 'bold',
        },
      }, userId);

      collaborationManager.applyOperation(operation);
      collaborationManager.undo();

      expect(model.serialized).toStrictEqual({
        identifier: documentId,
        blocks: [{
          name: 'paragraph',
          tunes: {},
          data: {
            text: {
              $t: 't',
              value: 'Hello world',
              fragments: [{
                tool: 'bold',
                range: [0, 5],
              }],
            },
          },
        }],
        properties: {},
      });
    });

    it('should redo text unformatting', () => {
      const model = new EditorJSModel(userId, { identifier: documentId });

      model.initializeDocument({
        blocks: [{
          name: 'paragraph',
          data: {
            text: {
              value: 'Hello world',
              $t: 't',
              fragments: [{
                tool: 'bold',
                range: [0, 5],
              }],
            },
          },
        }],
      });
      const collaborationManager = new CollaborationManager(config as Required<CoreConfig>, model);
      const index = new IndexBuilder().addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([0, 3])
        .build();
      const operation = new Operation(OperationType.Modify, index, {
        payload: null,
        prevPayload: {
          tool: 'bold',
        },
      }, userId);

      collaborationManager.applyOperation(operation);
      collaborationManager.undo();
      collaborationManager.redo();

      expect(model.serialized).toStrictEqual({
        identifier: documentId,
        blocks: [{
          name: 'paragraph',
          tunes: {},
          data: {
            text: {
              $t: 't',
              value: 'Hello world',
              fragments: [{
                tool: 'bold',
                range: [3, 5],
              }],
            },
          },
        }],
        properties: {},
      });
    });

    it('should undo block deletion', () => {
      const model = new EditorJSModel(userId, { identifier: documentId });
      const block = {
        name: 'paragraph',
        data: {
          text: {
            value: 'hello',
            $t: 't',
            fragments: [],
          },
        },
        tunes: {},
      };

      model.initializeDocument({
        blocks: [block],
      });
      const collaborationManager = new CollaborationManager(config as Required<CoreConfig>, model);
      const index = new IndexBuilder().addBlockIndex(0)
        .build();
      const operation = new Operation(OperationType.Delete, index, {
        payload: [block],
      }, userId);

      collaborationManager.applyOperation(operation);

      collaborationManager.undo();

      expect(model.serialized).toStrictEqual({
        identifier: documentId,
        blocks: [block],
        properties: {},
      });
    });
  });

  it('should undo the next operation', () => {
    const model = new EditorJSModel(userId, { identifier: documentId });
    const block = {
      name: 'paragraph',
      data: {
        text: {
          value: 'hello',
          $t: 't',
          fragments: [],
        },
      },
      tunes: {},
    };

    model.initializeDocument({
      blocks: [block],
    });
    const collaborationManager = new CollaborationManager(config as Required<CoreConfig>, model);
    const index = new IndexBuilder().addBlockIndex(0)
      .build();
    const operation = new Operation(OperationType.Delete, index, {
      payload: [block],
    }, userId);

    collaborationManager.applyOperation(operation);

    collaborationManager.undo();

    collaborationManager.applyOperation(operation);

    collaborationManager.undo();

    expect(model.serialized).toStrictEqual({
      identifier: documentId,
      blocks: [block],
      properties: {},
    });
  });

  it('should undo after redo', () => {
    const model = new EditorJSModel(userId, { identifier: documentId });
    const block = {
      name: 'paragraph',
      data: {
        text: {
          value: 'hello',
          $t: 't',
          fragments: [],
        },
      },
      tunes: {},
    };

    model.initializeDocument({
      blocks: [block],
    });
    const collaborationManager = new CollaborationManager(config as Required<CoreConfig>, model);
    const index = new IndexBuilder().addBlockIndex(0)
      .build();
    const operation = new Operation(OperationType.Delete, index, {
      payload: [block],
    }, userId);

    collaborationManager.applyOperation(operation);

    collaborationManager.undo();
    collaborationManager.redo();
    collaborationManager.undo();

    /**
     * Here to kill the mutant when redo operations are added to the undo stack twice
     */
    collaborationManager.undo();

    expect(model.serialized).toStrictEqual({
      identifier: documentId,
      blocks: [block],
      properties: {},
    });
  });

  it('should undo the next operation after redo', () => {
    const model = new EditorJSModel(userId, { identifier: documentId });
    const block = {
      name: 'paragraph',
      data: {
        text: {
          value: 'hello',
          $t: 't',
          fragments: [],
        },
      },
      tunes: {},
    };

    model.initializeDocument({
      blocks: [block],
    });
    const collaborationManager = new CollaborationManager(config as Required<CoreConfig>, model);
    const index = new IndexBuilder().addBlockIndex(0)
      .build();
    const operation = new Operation(OperationType.Delete, index, {
      payload: [block],
    }, userId);

    collaborationManager.applyOperation(operation);

    collaborationManager.undo();
    collaborationManager.redo();

    collaborationManager.applyOperation(
      new Operation(OperationType.Insert, index, {
        payload: [block],
      }, userId)
    );

    collaborationManager.undo();

    expect(model.serialized).toStrictEqual({
      identifier: documentId,
      blocks: [],
      properties: {},
    });
  });

  it('should undo batch', () => {
    const model = new EditorJSModel(userId, { identifier: documentId });

    model.initializeDocument({
      blocks: [{
        name: 'paragraph',
        data: {
          text: {
            value: '',
            $t: 't',
          },
        },
      }],
    });
    const collaborationManager = new CollaborationManager(config as Required<CoreConfig>, model);
    const index1 = new IndexBuilder().addBlockIndex(0)
      .addDataKey(createDataKey('text'))
      .addTextRange([0, 0])
      .build();
    const operation1 = new Operation(OperationType.Insert, index1, {
      payload: 't',
    }, userId);

    const index2 = new IndexBuilder().from(index1)
      .addTextRange([1, 1])
      .build();
    const operation2 = new Operation(OperationType.Insert, index2, {
      payload: 's',
    }, userId);

    collaborationManager.applyOperation(operation1);
    collaborationManager.applyOperation(operation2);

    collaborationManager.undo();

    expect(model.serialized).toStrictEqual({
      identifier: documentId,
      blocks: [{
        name: 'paragraph',
        tunes: {},
        data: {
          text: {
            $t: 't',
            value: '',
            fragments: [],
          },
        },
      }],
      properties: {},
    });
  });

  it('should redo batch', () => {
    const model = new EditorJSModel(userId, { identifier: documentId });

    model.initializeDocument({
      blocks: [{
        name: 'paragraph',
        data: {
          text: {
            value: '',
            $t: 't',
          },
        },
      }],
    });
    const collaborationManager = new CollaborationManager(config as Required<CoreConfig>, model);
    const index1 = new IndexBuilder().addBlockIndex(0)
      .addDataKey(createDataKey('text'))
      .addTextRange([0, 0])
      .build();
    const operation1 = new Operation(OperationType.Insert, index1, {
      payload: 't',
    }, userId);

    const index2 = new IndexBuilder().from(index1)
      .addTextRange([1, 1])
      .build();
    const operation2 = new Operation(OperationType.Insert, index2, {
      payload: 's',
    }, userId);

    collaborationManager.applyOperation(operation1);
    collaborationManager.applyOperation(operation2);

    collaborationManager.undo();
    collaborationManager.redo();

    expect(model.serialized).toStrictEqual({
      identifier: documentId,
      blocks: [{
        name: 'paragraph',
        tunes: {},
        data: {
          text: {
            $t: 't',
            value: 'ts',
            fragments: [],
          },
        },
      }],
      properties: {},
    });
  });

  it('should not undo operations from not a current user', () => {
    const model = new EditorJSModel(userId, { identifier: documentId });

    model.initializeDocument({
      blocks: [{
        name: 'paragraph',
        data: {
          text: {
            value: '',
            $t: 't',
          },
        },
      }],
    });
    const collaborationManager = new CollaborationManager(config as Required<CoreConfig>, model);

    model.insertText('another-user', 0, createDataKey('text'), 'hello', 0);

    collaborationManager.undo();

    expect(model.serialized).toStrictEqual({
      identifier: documentId,
      blocks: [{
        name: 'paragraph',
        tunes: {},
        data: {
          text: {
            $t: 't',
            value: 'hello',
            fragments: [],
          },
        },
      }],
      properties: {},
    });
  });

  describe('debounce', () => {
    it('should move the open batch to the undo stack after the debounce delay', () => {
      const putSpy = jest.spyOn(UndoRedoManager.prototype, 'put');

      const model = new EditorJSModel(userId, { identifier: documentId });

      model.initializeDocument({
        blocks: [{
          name: 'paragraph',
          data: {
            text: {
              value: '',
              $t: 't',
            },
          },
        }],
      });
      void new CollaborationManager(config as Required<CoreConfig>, model);

      model.insertText(userId, 0, createDataKey('text'), 'a', 0);

      expect(putSpy).not.toHaveBeenCalled();

      jest.advanceTimersByTime(500);

      expect(putSpy).toHaveBeenCalledTimes(1);
      expect(putSpy.mock.calls[0][0]).toBeInstanceOf(BatchedOperation);

      putSpy.mockRestore();
    });
  });

  describe('remote operations', () => {
    it('should transform current batch when remote operation arrives', () => {
      const model = new EditorJSModel(userId, { identifier: documentId });

      model.initializeDocument({
        blocks: [{
          name: 'paragraph',
          data: {
            text: {
              value: '',
              $t: 't',
            },
          },
        }],
      });

      const collaborationManager = new CollaborationManager(config as Required<CoreConfig>, model);

      // Create local operation
      const localIndex = new IndexBuilder().addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([0, 4])
        .build();

      const localOp = new Operation(OperationType.Insert, localIndex, {
        payload: 'test',
      }, userId);

      collaborationManager.applyOperation(localOp);

      // Apply remote operation
      const remoteIndex = new IndexBuilder().addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([0, 5])
        .build();

      const remoteOp = new Operation(OperationType.Insert, remoteIndex, {
        payload: 'hello',
      }, 'other-user');

      collaborationManager.applyOperation(remoteOp);

      // Verify the operations were transformed correctly
      expect(model.serialized).toStrictEqual({
        identifier: documentId,
        blocks: [{
          name: 'paragraph',
          tunes: {},
          data: {
            text: {
              $t: 't',
              value: 'hellotest',
              fragments: [],
            },
          },
        }],
        properties: {},
      });
    });

    it('should transform undo stack when remote user edits arrive through model events', () => {
      const model = new EditorJSModel(userId, { identifier: documentId });

      model.initializeDocument({
        blocks: [{
          name: 'paragraph',
          data: {
            text: {
              value: '',
              $t: 't',
            },
          },
        }],
      });

      const collaborationManager = new CollaborationManager(config as Required<CoreConfig>, model);

      model.insertText(userId, 0, createDataKey('text'), 'world', 0);
      jest.advanceTimersByTime(500);

      model.insertText('remote-user', 0, createDataKey('text'), 'hello', 0);

      collaborationManager.undo();

      expect(model.serialized).toStrictEqual({
        identifier: documentId,
        blocks: [{
          name: 'paragraph',
          tunes: {},
          data: {
            text: {
              $t: 't',
              value: 'hello',
              fragments: [],
            },
          },
        }],
        properties: {},
      });
    });

    it('should undo only local changes if remote user inserts inside of the local user char-by-char written text', () => {
      const model = new EditorJSModel(userId, { identifier: documentId });

      model.initializeDocument({
        blocks: [{
          name: 'paragraph',
          data: {
            text: {
              value: '',
              $t: 't',
            },
          },
        }],
      });

      const collaborationManager = new CollaborationManager(config as Required<CoreConfig>, model);
      const remoteCollaborationManager = new CollaborationManager(remoteConfig as Required<CoreConfig>, model);

      // Char-by-char insert text 'hello' from local user
      const localText = 'hello';

      for (let i = 0; i < localText.length; i++) {
        const char = localText[i];

        const localIndex = new IndexBuilder().addBlockIndex(0)
          .addDataKey(createDataKey('text'))
          .addTextRange([i, i])
          .build();

        const localOp = new Operation(OperationType.Insert, localIndex, {
          payload: char,
        }, userId);

        collaborationManager.applyOperation(localOp);
      }

      // Insert 'world' from remote user
      const remoteIndex = new IndexBuilder().addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([2, 2])
        .build();

      const remoteOp = new Operation(OperationType.Insert, remoteIndex, {
        payload: 'world',
      }, remoteUserId);

      remoteCollaborationManager.applyOperation(remoteOp);

      // Undo should remove only local operations because local char-by-char batched insert is not extended by remote insert
      collaborationManager.undo();

      expect(model.serialized).toStrictEqual({
        identifier: documentId,
        blocks: [{
          name: 'paragraph',
          tunes: {},
          data: {
            text: {
              $t: 't',
              value: 'world',
              fragments: [],
            },
          },
        }],
        properties: {},
      });
    });

    it('should undo all changes if remote user inserts inside of the local user inserted text', () => {
      const model = new EditorJSModel(userId, { identifier: documentId });

      model.initializeDocument({
        blocks: [{
          name: 'paragraph',
          data: {
            text: {
              value: '',
              $t: 't',
            },
          },
        }],
      });

      const collaborationManager = new CollaborationManager(config as Required<CoreConfig>, model);
      const remoteCollaborationManager = new CollaborationManager(remoteConfig as Required<CoreConfig>, model);

      // Isert line 'hello' from local user
      const localIndex = new IndexBuilder().addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([0, 0])
        .build();

      const localOp = new Operation(OperationType.Insert, localIndex, {
        payload: 'hello',
      }, userId);

      // Create remote insert index
      const remoteIndex = new IndexBuilder().addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([2, 2])
        .build();

      const remoteOp = new Operation(OperationType.Insert, remoteIndex, {
        payload: 'world',
      }, remoteUserId);

      collaborationManager.applyOperation(localOp);
      remoteCollaborationManager.applyOperation(remoteOp);

      // Undo should remove all of the text because local insert is extended by remote insert
      collaborationManager.undo();

      expect(model.serialized).toStrictEqual({
        identifier: documentId,
        blocks: [{
          name: 'paragraph',
          tunes: {},
          data: {
            text: {
              $t: 't',
              value: '',
              fragments: [],
            },
          },
        }],
        properties: {},
      });
    });

    it('should clear current batch if not transformable with remote operation', () => {
      const model = new EditorJSModel(userId, { identifier: documentId });

      model.initializeDocument({
        blocks: [{
          name: 'paragraph',
          data: {
            text: {
              value: '',
              $t: 't',
            },
          },
        }],
      });

      const collaborationManager = new CollaborationManager(config as Required<CoreConfig>, model);

      // Create local delete operation
      const localIndex = new IndexBuilder().addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([0, 0])
        .build();

      const localOp = new Operation(OperationType.Insert, localIndex, {
        payload: 'initial',
      }, userId);

      collaborationManager.applyOperation(localOp);

      // Apply conflicting remote operation
      model.removeText('other-user', 0, createDataKey('text'), 1, 7);

      // Verify the current batch was cleared by checking undo doesn't restore text
      collaborationManager.undo();

      expect(model.serialized).toStrictEqual({
        identifier: documentId,
        blocks: [{
          name: 'paragraph',
          tunes: {},
          data: {
            text: {
              $t: 't',
              value: '',
              fragments: [],
            },
          },
        }],
        properties: {},
      });
    });
  });
});
