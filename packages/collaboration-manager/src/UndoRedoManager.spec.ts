import { IndexBuilder } from '@editorjs/model';
import { describe } from '@jest/globals';
import { Operation, OperationType } from './Operation.js';
import { UndoRedoManager } from './UndoRedoManager.js';
import { jest } from '@jest/globals';

const userId = 'user';

/**
 * Helper function to create test operations
 *
 * @param index - block index of the operation
 * @param text - text of the operation
 * @param type - type of the operation
 */
function createOperation(index: number, text: string, type: OperationType = OperationType.Insert): Operation {
  return new Operation(
    type,
    new IndexBuilder()
      .addBlockIndex(index)
      .build(),
    {
      payload: [ {
        name: 'paragraph',
        data: { text },
      } ],
    },
    userId
  );
}

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
      },
      userId
    );

    manager.put(op);

    const invertedOp = manager.undo();

    expect(invertedOp).toEqual(op.inverse());
  });

  it('should return undefined on undo if there is no operations in stack', () => {
    const manager = new UndoRedoManager();

    expect(manager.undo()).toBeUndefined();
  });

  it('should return undefined on redo if there is no operations in stack', () => {
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
      },
      userId
    );

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
      },
      userId
    );


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
      },
      userId
    );

    manager.put(op);
    manager.undo();
    manager.put(newOp);

    const result = manager.redo();

    expect(result).toBeUndefined();
  });

  describe('transform operations', () => {
    it('should transform undo stack operations', () => {
      const manager = new UndoRedoManager();
      const op1 = createOperation(0, 'first');
      const op2 = createOperation(1, 'second');

      // Put operations in undo stack
      manager.put(op1);
      manager.put(op2);

      // Create operation that will affect the stack
      const transformingOp = createOperation(0, 'transform');

      // Mock transform method
      const transformSpy = jest.spyOn(op2, 'transform').mockReturnValue(createOperation(2, 'transformed'));

      manager.transformStacks(transformingOp);

      expect(transformSpy).toHaveBeenCalledWith(transformingOp);
    });

    it('should handle empty stacks during transformation', () => {
      const manager = new UndoRedoManager();
      const transformingOp = createOperation(0, 'transform');

      // Should not throw when transforming empty stacks
      expect(() => {
        manager.transformStacks(transformingOp);
      }).not.toThrow();
    });

    it('should maintain correct operation order after transforming both stacks', () => {
      const manager = new UndoRedoManager();
      const op1 = createOperation(0, 'first');
      const op2 = createOperation(1, 'second');
      const op3 = createOperation(2, 'third');

      // Setup initial state
      manager.put(op1);
      manager.put(op2);
      manager.put(op3);

      // Move op3 and op2 to redo stack
      manager.undo(); // undo op3
      manager.undo(); // undo op2

      const transformingOp = createOperation(0, 'transform');

      // Mock transforms to return operations with shifted indices
      /* eslint-disable @typescript-eslint/no-magic-numbers */
      jest.spyOn(op1, 'transform').mockReturnValue(createOperation(1, 'transformed-1'));
      jest.spyOn(op2, 'transform').mockReturnValue(createOperation(2, 'transformed-2'));
      jest.spyOn(op3, 'transform').mockReturnValue(createOperation(3, 'transformed-3'));
      /* eslint-enable @typescript-eslint/no-magic-numbers */
      manager.transformStacks(transformingOp);

      // Verify operations can be redone in correct order
      const redoOp1 = manager.redo();
      const redoOp2 = manager.redo();

      expect(redoOp1?.index.blockIndex?.toString()).toBe('2'); // transformed op2
      expect(redoOp2?.index.blockIndex?.toString()).toBe('3'); // transformed op3
    });
  });
});
