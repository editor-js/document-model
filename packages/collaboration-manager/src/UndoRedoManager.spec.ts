import { IndexBuilder } from '@editorjs/model';
import { describe } from '@jest/globals';
import { Operation, OperationType } from './Operation.js';
import { UndoRedoManager } from './UndoRedoManager.js';

const userId = 'user';

/**
 * Helper function to create test operations
 */
function createOperation(index: number, text: string): Operation {
  return new Operation(
    OperationType.Insert,
    new IndexBuilder()
      .addBlockIndex(index)
      .build(),
    {
      payload: [{
        name: 'paragraph',
        data: { text },
      }],
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
      
      manager.transformUndoStack(transformingOp);

      expect(transformSpy).toHaveBeenCalledWith(transformingOp);
    });

    it('should transform redo stack operations', () => {
      const manager = new UndoRedoManager();
      const op1 = createOperation(0, 'first');
      
      // Put operation and undo it to move it to redo stack
      manager.put(op1);
      manager.undo();

      // Create operation that will affect the stack
      const transformingOp = createOperation(0, 'transform');

      // Mock transform method
      const transformSpy = jest.spyOn(op1, 'transform').mockReturnValue(createOperation(1, 'transformed'));
      
      manager.transformRedoStack(transformingOp);

      expect(transformSpy).toHaveBeenCalledWith(transformingOp);
    });

    it('should remove operations from stack if transform returns null', () => {
      const manager = new UndoRedoManager();
      const op1 = createOperation(0, 'first');
      const op2 = createOperation(1, 'second');
      
      manager.put(op1);
      manager.put(op2);

      // Mock transform to return null
      jest.spyOn(op2, 'transform').mockReturnValue(null);
      
      const transformingOp = createOperation(0, 'transform');
      manager.transformUndoStack(transformingOp);

      // Try to undo twice - second undo should return undefined since op2 was removed
      expect(manager.undo()).toBeDefined();
      expect(manager.undo()).toBeUndefined();
    });

    it('should handle empty stacks during transformation', () => {
      const manager = new UndoRedoManager();
      const transformingOp = createOperation(0, 'transform');

      // Should not throw when transforming empty stacks
      expect(() => {
        manager.transformUndoStack(transformingOp);
        manager.transformRedoStack(transformingOp);
      }).not.toThrow();
    });

    it('should transform both undo and redo stacks when operations are undone', () => {
      const manager = new UndoRedoManager();
      const op1 = createOperation(0, 'first');
      const op2 = createOperation(1, 'second');
      
      // Put operations in undo stack
      manager.put(op1);
      manager.put(op2);
      
      // Undo op2 to move it to redo stack
      manager.undo();

      // Create operation that will affect both stacks
      const transformingOp = createOperation(0, 'transform');

      // Mock transform methods
      const undoStackSpy = jest.spyOn(op1, 'transform').mockReturnValue(createOperation(1, 'transformed-undo'));
      const redoStackSpy = jest.spyOn(op2, 'transform').mockReturnValue(createOperation(2, 'transformed-redo'));
      
      // Transform both stacks
      manager.transformUndoStack(transformingOp);
      manager.transformRedoStack(transformingOp);

      expect(undoStackSpy).toHaveBeenCalledWith(transformingOp);
      expect(redoStackSpy).toHaveBeenCalledWith(transformingOp);
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
      jest.spyOn(op1, 'transform').mockReturnValue(createOperation(1, 'transformed-1'));
      jest.spyOn(op2, 'transform').mockReturnValue(createOperation(2, 'transformed-2'));
      jest.spyOn(op3, 'transform').mockReturnValue(createOperation(3, 'transformed-3'));
      
      manager.transformUndoStack(transformingOp);
      manager.transformRedoStack(transformingOp);

      // Verify operations can be redone in correct order
      const redoOp1 = manager.redo();
      const redoOp2 = manager.redo();
      
      expect(redoOp1?.index.toString()).toBe('2'); // transformed op2
      expect(redoOp2?.index.toString()).toBe('3'); // transformed op3
    });
  });
});
