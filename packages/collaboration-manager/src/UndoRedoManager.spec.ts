import { IndexBuilder } from '@editorjs/model';
import { describe } from '@jest/globals';
import { Operation, OperationType } from './Operation.js';
import { UndoRedoManager } from './UndoRedoManager.js';

describe('UndoRedoManager', () => {
  it('should return inverted operation on undo', () => {
    const manager = new UndoRedoManager();

    const op = new Operation(
      OperationType.Insert,
      new IndexBuilder()
        .addBlockIndex(0)
        .build(),
      {
        payload: [ {
          name: 'paragraph',
          data: { text: 'editor.js' },
        } ],
      });

    manager.put(op);

    const invertedOp = manager.undo();

    expect(invertedOp).toEqual(op.inverse());
  });

  it('should return undefined on undo if there is no operations in stack', () => {
    const manager = new UndoRedoManager();

    expect(manager.undo()).toBeUndefined();
  });

  it('should return undefined on undo if there is no operations in stack', () => {
    const manager = new UndoRedoManager();

    expect(manager.redo()).toBeUndefined();
  });

  it('should return the original operation on redo', () => {
    const manager = new UndoRedoManager();

    const op = new Operation(
      OperationType.Insert,
      new IndexBuilder()
        .addBlockIndex(0)
        .build(),
      {
        payload: [ {
          name: 'paragraph',
          data: { text: 'editor.js' },
        } ],
      });

    manager.put(op);

    manager.undo();

    const result = manager.redo();

    expect(result).toEqual(op);
  });

  it('should flush the redo stack on put', () => {
    const manager = new UndoRedoManager();

    const op = new Operation(
      OperationType.Insert,
      new IndexBuilder()
        .addBlockIndex(0)
        .build(),
      {
        payload: [ {
          name: 'paragraph',
          data: { text: 'editor.js' },
        } ],
      });


    const newOp = new Operation(
      OperationType.Insert,
      new IndexBuilder()
        .addBlockIndex(0)
        .build(),
      {
        payload: [ {
          name: 'paragraph',
          data: { text: 'hello' },
        } ],
      });

    manager.put(op);
    manager.undo();
    manager.put(newOp);

    const result = manager.redo();

    expect(result).toBeUndefined();
  });
});
