/* eslint-disable @typescript-eslint/no-magic-numbers */
import { createDataKey, IndexBuilder } from '@editorjs/model';
import { EditorJSModel } from '@editorjs/model';
import type { CoreConfig } from '@editorjs/sdk';
import { beforeAll, jest } from '@jest/globals';
import { CollaborationManager } from './CollaborationManager.js';
import { Operation, OperationType } from './Operation.js';

const config: Partial<CoreConfig> = { userId: 'user' };

describe('CollaborationManager', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  describe('applyOperation', () => {
    it('should throw an error on unknown operation type', () => {
      const model = new EditorJSModel();

      const collaborationManager = new CollaborationManager(config, model);

      // @ts-expect-error - for test purposes
      expect(() => collaborationManager.applyOperation(new Operation('unknown', new IndexBuilder().build(), 'hello'))).toThrow('Unknown operation type');
    });

    it('should add text on apply Insert Operation', () => {
      const model = new EditorJSModel();

      model.initializeDocument({
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
      const collaborationManager = new CollaborationManager(config, model);
      const index = new IndexBuilder().addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([0, 4])
        .build();
      const operation = new Operation(OperationType.Insert, index, {
        payload: 'test',
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
      const model = new EditorJSModel();

      model.initializeDocument({
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
      const collaborationManager = new CollaborationManager(config, model);
      const index = new IndexBuilder().addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([
          3, 5])
        .build();
      const operation = new Operation(OperationType.Delete, index, {
        payload: '11',
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

    it('should add Block on apply Insert Operation', () => {
      const model = new EditorJSModel();

      model.initializeDocument({
        blocks: [],
      });
      const collaborationManager = new CollaborationManager(config, model);
      const index = new IndexBuilder().addBlockIndex(0)
        .build();
      const operation = new Operation(OperationType.Insert, index, {
        payload: [ {
          name: 'paragraph',
          data: {
            text: {
              value: 'hello',
              $t: 't',
            },
          },
        } ],
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

    it('should remove Block on apply Delete Operation', () => {
      const model = new EditorJSModel();
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
        blocks: [ block ],
      });
      const collaborationManager = new CollaborationManager(config, model);
      const index = new IndexBuilder().addBlockIndex(0)
        .build();
      const operation = new Operation(OperationType.Delete, index, {
        payload: [ block ],
      });

      collaborationManager.applyOperation(operation);
      expect(model.serialized).toStrictEqual({
        blocks: [],
        properties: {},
      });
    });

    it('should format text on apply Modify Operation', () => {
      const model = new EditorJSModel();

      model.initializeDocument({
        blocks: [ {
          name: 'paragraph',
          data: {
            text: {
              value: 'Hello world',
              $t: 't',
            },
          },
        } ],
      });
      const collaborationManager = new CollaborationManager(config, model);
      const index = new IndexBuilder().addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([0, 5])
        .build();
      const operation = new Operation(OperationType.Modify, index, {
        payload: {
          tool: 'bold',
        },
        prevPayload: null,
      });

      collaborationManager.applyOperation(operation);
      expect(model.serialized).toStrictEqual({
        blocks: [ {
          name: 'paragraph',
          tunes: {},
          data: {
            text: {
              $t: 't',
              value: 'Hello world',
              fragments: [ {
                tool: 'bold',
                range: [0, 5],
              } ],
            },
          },
        } ],
        properties: {},
      });
    });

    it('should unformat text on apply Modify Operation', () => {
      const model = new EditorJSModel();

      model.initializeDocument({
        blocks: [ {
          name: 'paragraph',
          data: {
            text: {
              value: 'Hello world',
              $t: 't',
              fragments: [ {
                tool: 'bold',
                range: [0, 5],
              } ],
            },
          },
        } ],
      });
      const collaborationManager = new CollaborationManager(config, model);
      const index = new IndexBuilder().addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([0, 3])
        .build();
      const operation = new Operation(OperationType.Modify, index, {
        payload: null,
        prevPayload: {
          tool: 'bold',
        },
      });

      collaborationManager.applyOperation(operation);
      expect(model.serialized).toStrictEqual({
        blocks: [ {
          name: 'paragraph',
          tunes: {},
          data: {
            text: {
              $t: 't',
              value: 'Hello world',
              fragments: [ {
                tool: 'bold',
                range: [3, 5],
              } ],
            },
          },
        } ],
        properties: {},
      });
    });
  });

  describe('undo logic', () => {
    beforeAll(() => {
      jest.useFakeTimers();
    });

    it('should invert Insert operation', () => {
      const model = new EditorJSModel();

      model.initializeDocument({
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
      const collaborationManager = new CollaborationManager(config, model);
      const index = new IndexBuilder().addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([0, 4])
        .build();
      const operation = new Operation(OperationType.Insert, index, {
        payload: 'test',
      });

      collaborationManager.applyOperation(operation);
      collaborationManager.undo();
      expect(model.serialized).toStrictEqual({
        blocks: [ {
          name: 'paragraph',
          tunes: {},
          data: {
            text: {
              $t: 't',
              value: '',
              fragments: [],
            },
          },
        } ],
        properties: {},
      });
    });

    it('should invert Remove operation', () => {
      const model = new EditorJSModel();

      model.initializeDocument({
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
      const collaborationManager = new CollaborationManager(config, model);
      const index = new IndexBuilder().addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([
          3, 5])
        .build();
      const operation = new Operation(OperationType.Delete, index, {
        payload: '11',
      });

      collaborationManager.applyOperation(operation);
      collaborationManager.undo();
      expect(model.serialized).toStrictEqual({
        blocks: [ {
          name: 'paragraph',
          tunes: {},
          data: {
            text: {
              $t: 't',
              value: 'hel11lo',
              fragments: [],
            },
          },
        } ],
        properties: {},
      });
    });

    it('should revert only one operation if stack length is 1', () => {
      const model = new EditorJSModel();

      model.initializeDocument({
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
      const collaborationManager = new CollaborationManager(config, model);
      const index = new IndexBuilder().addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([0, 4])
        .build();
      const operation = new Operation(OperationType.Insert, index, {
        payload: 'test',
      });

      collaborationManager.applyOperation(operation);
      collaborationManager.undo();
      collaborationManager.undo();
      expect(model.serialized).toStrictEqual({
        blocks: [ {
          name: 'paragraph',
          tunes: {},
          data: {
            text: {
              $t: 't',
              value: '',
              fragments: [],
            },
          },
        } ],
        properties: {},
      });
    });

    it('should revert back to original state after undo and redo operations', () => {
      const model = new EditorJSModel();

      model.initializeDocument({
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
      const collaborationManager = new CollaborationManager(config, model);
      const index = new IndexBuilder().addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([0, 4])
        .build();
      const operation = new Operation(OperationType.Insert, index, {
        payload: 'test',
      });

      collaborationManager.applyOperation(operation);
      collaborationManager.undo();
      collaborationManager.redo();

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

    it('should undo block insert', () => {
      const model = new EditorJSModel();

      model.initializeDocument({
        blocks: [],
      });
      const collaborationManager = new CollaborationManager(config, model);
      const index = new IndexBuilder().addBlockIndex(0)
        .build();
      const operation = new Operation(OperationType.Insert, index, {
        payload: [ {
          name: 'paragraph',
          data: {
            text: {
              value: 'hello',
              $t: 't',
            },
          },
        } ],
      });

      collaborationManager.applyOperation(operation);

      collaborationManager.undo();

      expect(model.serialized).toStrictEqual({
        blocks: [],
        properties: {},
      });
    });

    it('should undo text formatting', () => {
      const model = new EditorJSModel();

      model.initializeDocument({
        blocks: [ {
          name: 'paragraph',
          data: {
            text: {
              value: 'Hello world',
              $t: 't',
            },
          },
        } ],
      });
      const collaborationManager = new CollaborationManager(config, model);
      const index = new IndexBuilder().addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([0, 5])
        .build();
      const operation = new Operation(OperationType.Modify, index, {
        payload: {
          tool: 'bold',
        },
        prevPayload: null,
      });

      collaborationManager.applyOperation(operation);
      collaborationManager.undo();

      expect(model.serialized).toStrictEqual({
        blocks: [ {
          name: 'paragraph',
          tunes: {},
          data: {
            text: {
              $t: 't',
              value: 'Hello world',
              fragments: [],
            },
          },
        } ],
        properties: {},
      });
    });

    it('should undo text unformatting', () => {
      const model = new EditorJSModel();

      model.initializeDocument({
        blocks: [ {
          name: 'paragraph',
          data: {
            text: {
              value: 'Hello world',
              $t: 't',
              fragments: [ {
                tool: 'bold',
                range: [0, 5],
              } ],
            },
          },
        } ],
      });
      const collaborationManager = new CollaborationManager(config, model);
      const index = new IndexBuilder().addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([0, 3])
        .build();
      const operation = new Operation(OperationType.Modify, index, {
        payload: null,
        prevPayload: {
          tool: 'bold',
        },
      });

      collaborationManager.applyOperation(operation);
      collaborationManager.undo();

      expect(model.serialized).toStrictEqual({
        blocks: [ {
          name: 'paragraph',
          tunes: {},
          data: {
            text: {
              $t: 't',
              value: 'Hello world',
              fragments: [ {
                tool: 'bold',
                range: [0, 5],
              } ],
            },
          },
        } ],
        properties: {},
      });
    });

    it('should redo text unformatting', () => {
      const model = new EditorJSModel();

      model.initializeDocument({
        blocks: [ {
          name: 'paragraph',
          data: {
            text: {
              value: 'Hello world',
              $t: 't',
              fragments: [ {
                tool: 'bold',
                range: [0, 5],
              } ],
            },
          },
        } ],
      });
      const collaborationManager = new CollaborationManager(config, model);
      const index = new IndexBuilder().addBlockIndex(0)
        .addDataKey(createDataKey('text'))
        .addTextRange([0, 3])
        .build();
      const operation = new Operation(OperationType.Modify, index, {
        payload: null,
        prevPayload: {
          tool: 'bold',
        },
      });

      collaborationManager.applyOperation(operation);
      collaborationManager.undo();
      collaborationManager.redo();

      expect(model.serialized).toStrictEqual({
        blocks: [ {
          name: 'paragraph',
          tunes: {},
          data: {
            text: {
              $t: 't',
              value: 'Hello world',
              fragments: [ {
                tool: 'bold',
                range: [3, 5],
              } ],
            },
          },
        } ],
        properties: {},
      });
    });

    it('should undo block deletion', () => {
      const model = new EditorJSModel();
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
        blocks: [ block ],
      });
      const collaborationManager = new CollaborationManager(config, model);
      const index = new IndexBuilder().addBlockIndex(0)
        .build();
      const operation = new Operation(OperationType.Delete, index, {
        payload: [ block ],
      });

      collaborationManager.applyOperation(operation);

      collaborationManager.undo();

      expect(model.serialized).toStrictEqual({
        blocks: [ block ],
        properties: {},
      });
    });
  });

  it('should undo the next operation', () => {
    const model = new EditorJSModel();
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
      blocks: [ block ],
    });
    const collaborationManager = new CollaborationManager(config, model);
    const index = new IndexBuilder().addBlockIndex(0)
      .build();
    const operation = new Operation(OperationType.Delete, index, {
      payload: [ block ],
    });

    collaborationManager.applyOperation(operation);

    collaborationManager.undo();

    collaborationManager.applyOperation(operation);

    collaborationManager.undo();

    expect(model.serialized).toStrictEqual({
      blocks: [ block ],
      properties: {},
    });
  });

  it('should undo after redo', () => {
    const model = new EditorJSModel();
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
      blocks: [ block ],
    });
    const collaborationManager = new CollaborationManager(config, model);
    const index = new IndexBuilder().addBlockIndex(0)
      .build();
    const operation = new Operation(OperationType.Delete, index, {
      payload: [ block ],
    });

    collaborationManager.applyOperation(operation);

    collaborationManager.undo();
    collaborationManager.redo();
    collaborationManager.undo();

    /**
     * Here to kill the mutant when redo operations are added to the undo stack twice
     */
    collaborationManager.undo();

    expect(model.serialized).toStrictEqual({
      blocks: [ block ],
      properties: {},
    });
  });


  it('should undo the next operation after redo', () => {
    const model = new EditorJSModel();
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
      blocks: [ block ],
    });
    const collaborationManager = new CollaborationManager(config, model);
    const index = new IndexBuilder().addBlockIndex(0)
      .build();
    const operation = new Operation(OperationType.Delete, index, {
      payload: [ block ],
    });

    collaborationManager.applyOperation(operation);

    collaborationManager.undo();
    collaborationManager.redo();

    collaborationManager.applyOperation(
      new Operation(OperationType.Insert, index, {
        payload: [ block ],
      })
    );

    collaborationManager.undo();

    expect(model.serialized).toStrictEqual({
      blocks: [],
      properties: {},
    });
  });

  it('should undo batch', () => {
    const model = new EditorJSModel();

    model.initializeDocument({
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
    const collaborationManager = new CollaborationManager(config, model);
    const index1 = new IndexBuilder().addBlockIndex(0)
      .addDataKey(createDataKey('text'))
      .addTextRange([0, 0])
      .build();
    const operation1 = new Operation(OperationType.Insert, index1, {
      payload: 'te',
    });

    const index2 = new IndexBuilder().from(index1)
      .addTextRange([1, 1])
      .build();
    const operation2 = new Operation(OperationType.Insert, index2, {
      payload: 'st',
    });

    collaborationManager.applyOperation(operation1);
    collaborationManager.applyOperation(operation2);

    collaborationManager.undo();

    expect(model.serialized).toStrictEqual({
      blocks: [ {
        name: 'paragraph',
        tunes: {},
        data: {
          text: {
            $t: 't',
            value: '',
            fragments: [],
          },
        },
      } ],
      properties: {},
    });
  });

  it('should redo batch', () => {
    const model = new EditorJSModel();

    model.initializeDocument({
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
    const collaborationManager = new CollaborationManager(config, model);
    const index1 = new IndexBuilder().addBlockIndex(0)
      .addDataKey(createDataKey('text'))
      .addTextRange([0, 0])
      .build();
    const operation1 = new Operation(OperationType.Insert, index1, {
      payload: 'te',
    });

    const index2 = new IndexBuilder().from(index1)
      .addTextRange([1, 1])
      .build();
    const operation2 = new Operation(OperationType.Insert, index2, {
      payload: 'st',
    });

    collaborationManager.applyOperation(operation1);
    collaborationManager.applyOperation(operation2);

    collaborationManager.undo();
    collaborationManager.redo();

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

  it('should not undo operations from not a current user', () => {
    const model = new EditorJSModel();

    model.initializeDocument({
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
    const collaborationManager = new CollaborationManager(config, model);

    model.insertText('another-user', 0, createDataKey('text'), 'hello', 0);

    collaborationManager.undo();

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
