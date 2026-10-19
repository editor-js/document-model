/* eslint-disable @typescript-eslint/no-magic-numbers, jsdoc/require-jsdoc, @typescript-eslint/naming-convention */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { CoreConfigValidated } from '@editorjs/sdk';
// @ts-expect-error -- type import
import type { EventType } from '@editorjs/sdk';

const USER_ID = 'user';
const OTHER_USER_ID = 'other-user';

// Register ESM mocks before importing the module under test
jest.unstable_mockModule('@editorjs/model', () => {
  const EditorJSModel = jest.fn(() => ({
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    insertData: jest.fn(),
    removeData: jest.fn(),
    modifyData: jest.fn(),
  }));

  return {
    EditorJSModel,
  };
});

jest.unstable_mockModule('@editorjs/sdk', () => ({
  CoreEventType: {
    Undo: 'undo',
    Redo: 'redo',
  },
  EventBus: jest.fn(() => ({
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
  EventType: { Changed: 'model:changed' },
  EventAction: {
    Added: 'added',
    Removed: 'removed',
    Modified: 'modified',
  },
  TextIndex: class TextIndex {},
  BlockIndex: class BlockIndex {},
}));

const { EditorJSModel } = await import('@editorjs/model');
const { EventType, EventAction, EventBus, TextIndex, BlockIndex } = await import('@editorjs/sdk');
const { UndoRedoManager } = await import('./UndoRedoManager.js');

// ─── helpers ────────────────────────────────────────────────────────────────

type MockModel = {
  addEventListener: jest.Mock;
  removeEventListener: jest.Mock;
  insertData: jest.Mock;
  removeData: jest.Mock;
  modifyData: jest.Mock;
};

type MockEventBus = {
  addEventListener: jest.Mock;
  removeEventListener: jest.Mock;
  dispatchEvent: jest.Mock;
};

/**
 * Creates Index mock
 * @param options - index mock  options
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createIndex(options: {
  isTextIndex?: boolean;
  blockIndex?: number;
  dataKey?: string;
  textRange?: [number, number] | undefined;
} = {}) {
  const isTextIndex = options.isTextIndex ?? true;

  const fields = {
    isTextIndex,
    blockIndex: options.blockIndex ?? 0,
    dataKey: options.dataKey ?? 'text',
    textRange: 'textRange' in options ? options.textRange : ([0, 0] as [number, number]),
  };

  // Non-text indices must NOT be instances of TextIndex, so #canAddToBatch's
  // `instanceof TextIndex` guard correctly rejects them.
  return isTextIndex
    ? Object.assign(new (TextIndex as unknown as new () => object)(), fields)
    : fields;
}

/**
 * Creates model event payload mock
 * @param action - event action
 * @param options - payload options (index, data, userId)
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createPayload(
  action: string,
  options: {
    index?: ReturnType<typeof createIndex>;
    data?: unknown;
    userId?: string;
  } = {}
) {
  return {
    action,
    index: options.index ?? createIndex(),
    data: options.data ?? 'a',
    userId: options.userId ?? USER_ID,
  };
}

function fireModelEvent(listener: (e: unknown) => void, payload: ReturnType<typeof createPayload>): void {
  listener({ detail: payload });
}

/**
 * Ends the current browser task: runs the zero-delay timer UndoRedoManager uses to
 * detect the task boundary, without letting the 500 ms debounce fire
 */
function endTask(): void {
  jest.advanceTimersByTime(0);
}

describe('UndoRedoManager', () => {
  let model: MockModel;
  let eventBus: MockEventBus;
  let manager: InstanceType<typeof UndoRedoManager>;
  let modelChangedListener: (e: unknown) => void;
  let undoEventListener: (options: { defaultPrevented: boolean }) => void;
  let redoEventListener: (options: { defaultPrevented: boolean }) => void;

  beforeEach(() => {
    jest.useFakeTimers();

    model = new (EditorJSModel as unknown as new () => MockModel)();
    eventBus = new (EventBus as unknown as new () => MockEventBus)();

    // Intercept the model Changed listener so tests can trigger it directly
    model.addEventListener = jest.fn((...args: unknown[]) => {
      const [type, callback] = args as [EventType, (e: unknown) => void];

      if (type === EventType.Changed) {
        modelChangedListener = callback;
      }
    });

    // Intercept the eventBus undo/redo listeners
    eventBus.addEventListener = jest.fn((...args: unknown[]) => {
      const [type, callback] = args as [string, () => void];

      if (type === 'core:undo') {
        undoEventListener = callback;
      } else if (type === 'core:redo') {
        redoEventListener = callback;
      }
    });

    manager = new UndoRedoManager(
      model as unknown as InstanceType<typeof EditorJSModel>,
      eventBus as unknown as InstanceType<typeof EventBus>,
      { userId: USER_ID } as CoreConfigValidated
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should register a listener for model Changed events', () => {
      expect(model.addEventListener).toHaveBeenCalledWith(
        EventType.Changed,
        expect.any(Function)
      );
    });

    it('should register an undo listener on the eventBus', () => {
      expect(eventBus.addEventListener).toHaveBeenCalledWith(
        'core:undo',
        expect.any(Function)
      );
    });

    it('should register a redo listener on the eventBus', () => {
      expect(eventBus.addEventListener).toHaveBeenCalledWith(
        'core:redo',
        expect.any(Function)
      );
    });
  });

  describe('.destroy()', () => {
    it('should remove the undo listener from eventBus', () => {
      manager.destroy();

      expect(eventBus.removeEventListener).toHaveBeenCalledWith(
        'core:undo',
        expect.any(Function)
      );
    });

    it('should remove the redo listener from eventBus', () => {
      manager.destroy();

      expect(eventBus.removeEventListener).toHaveBeenCalledWith(
        'core:redo',
        expect.any(Function)
      );
    });

    it('should clear the debounce timer', () => {
      const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');

      fireModelEvent(modelChangedListener, createPayload(EventAction.Added));

      manager.destroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should not record events buffered for an unfinished task after destroy', () => {
      fireModelEvent(modelChangedListener, createPayload(EventAction.Added));

      manager.destroy();
      jest.runAllTimers();
      manager.undo();

      expect(model.removeData).not.toHaveBeenCalled();
    });

    it('should remove the model updates listener', () => {
      manager.destroy();

      expect(model.removeEventListener).toHaveBeenCalledWith(
        'model:changed',
        expect.any(Function)
      );
    });
  });

  describe('EventBus integration', () => {
    it('should undo when the core:undo event fires on EventBus', () => {
      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Added,
          {
            index: createIndex({ textRange: [0, 0] }),
            data: 'a',
          }
        )
      );
      jest.runAllTimers();

      undoEventListener({ defaultPrevented: false });

      expect(model.removeData).toHaveBeenCalled();
    });

    it('should redo when the core:redo event fires on EventBus', () => {
      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Added,
          {
            index: createIndex({ textRange: [0, 0] }),
            data: 'a',
          }
        )
      );
      jest.runAllTimers();

      manager.undo();
      redoEventListener({ defaultPrevented: false });

      expect(model.insertData).toHaveBeenCalled();
    });

    it('should not undo if the event was cancelled', () => {
      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Added,
          {
            index: createIndex({ textRange: [0, 0] }),
            data: 'a',
          }
        )
      );
      jest.runAllTimers();

      undoEventListener({ defaultPrevented: true });

      expect(model.removeData).not.toHaveBeenCalled();
    });

    it('should not redo when the event was cancelled', () => {
      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Added,
          {
            index: createIndex({ textRange: [0, 0] }),
            data: 'a',
          }
        )
      );
      jest.runAllTimers();

      manager.undo();
      redoEventListener({ defaultPrevented: true });

      expect(model.insertData).not.toHaveBeenCalled();
    });
  });

  describe('.undo()', () => {
    it('should do nothing when the undo stack is empty', () => {
      manager.undo();

      expect(model.removeData).not.toHaveBeenCalled();
      expect(model.insertData).not.toHaveBeenCalled();
      expect(model.modifyData).not.toHaveBeenCalled();
    });

    it('should apply the inverse of an Added event by calling model.removeData', () => {
      const index = createIndex({ textRange: [0, 0] });

      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Added,
          {
            index,
            data: 'hello',
          }
        )
      );
      jest.runAllTimers();

      manager.undo();

      expect(model.removeData).toHaveBeenCalledWith(USER_ID, index, 'hello');
    });

    it('should apply the inverse of a Removed event by calling model.insertData', () => {
      const index = createIndex({ textRange: [0, 5] });

      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Removed,
          {
            index,
            data: 'hello',
          }
        )
      );
      jest.runAllTimers();

      manager.undo();

      expect(model.insertData).toHaveBeenCalledWith(USER_ID, index, 'hello');
    });

    it('should apply the inverse of a Modified event with swapped value/previous', () => {
      const index = createIndex({
        isTextIndex: false,
        textRange: undefined,
      });

      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Modified,
          {
            index,
            data: {
              value: 'new',
              previous: 'old',
            },
          }
        )
      );
      jest.runAllTimers();

      manager.undo();

      expect(model.modifyData).toHaveBeenCalledWith(USER_ID, index, {
        value: 'old',
        previous: 'new',
      });
    });

    it('should flush the current batch before undoing', () => {
      const index = createIndex({ textRange: [0, 0] });

      // Fire event but do NOT advance timers – batch is still pending
      fireModelEvent(modelChangedListener, createPayload(EventAction.Added, { index,
        data: 'a' }));

      // undo must flush the batch and then undo
      manager.undo();

      expect(model.removeData).toHaveBeenCalledWith(USER_ID, index, 'a');
    });

    it('should push the inverse events to the redo stack after undoing', () => {
      const index = createIndex({ textRange: [0, 0] });

      fireModelEvent(modelChangedListener, createPayload(EventAction.Added, { index,
        data: 'a' }));
      jest.runAllTimers();

      manager.undo();
      // redo must be possible now
      manager.redo();

      expect(model.insertData).toHaveBeenCalled();
    });

    it('should undo multiple batched events in one step', () => {
      const index1 = createIndex({ textRange: [0, 0] });
      const index2 = createIndex({ textRange: [1, 1] });

      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Added,
          {
            index: index1,
            data: 'a',
          }
        )
      );
      endTask();
      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Added,
          {
            index: index2,
            data: 'b',
          }
        )
      );
      endTask();
      jest.runAllTimers();

      manager.undo();

      expect(model.removeData).toHaveBeenCalledTimes(2);
    });

    it('should ignore model events triggered during undo application', () => {
      const index = createIndex({ textRange: [0, 0] });

      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Added,
          {
            index,
            data: 'a',
          }
        )
      );
      jest.runAllTimers();

      // While applying, the model fires a Removed event – it should be swallowed
      model.removeData = jest.fn(() => {
        fireModelEvent(
          modelChangedListener,
          createPayload(
            EventAction.Removed,
            {
              index,
              data: 'a',
            }
          )
        );
      });

      manager.undo();
      jest.runAllTimers();

      // The undo stack should be empty – the inner event was ignored
      const insertDataMock = jest.fn();

      model.insertData = insertDataMock;
      manager.undo();

      expect(insertDataMock).not.toHaveBeenCalled();
    });
  });

  describe('.redo()', () => {
    it('should do nothing when the redo stack is empty', () => {
      manager.redo();

      expect(model.removeData).not.toHaveBeenCalled();
      expect(model.insertData).not.toHaveBeenCalled();
      expect(model.modifyData).not.toHaveBeenCalled();
    });

    it('should re-apply an undone Added event by calling model.insertData', () => {
      const index = createIndex({ textRange: [0, 0] });

      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Added,
          {
            index,
            data: 'hello',
          }
        )
      );
      jest.runAllTimers();

      manager.undo();
      manager.redo();

      expect(model.insertData).toHaveBeenCalledWith(USER_ID, index, 'hello');
    });

    it('should re-apply an undone Removed event by calling model.removeData', () => {
      const index = createIndex({ textRange: [0, 5] });

      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Removed,
          {
            index,
            data: 'hello',
          }
        )
      );
      jest.runAllTimers();

      manager.undo();
      manager.redo();

      expect(model.removeData).toHaveBeenCalledWith(USER_ID, index, 'hello');
    });

    it('should re-apply an undone Modified event by calling model.modifyData with the same values', () => {
      const index = createIndex({ textRange: [0, 5] });

      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Modified,
          {
            index,
            data: {
              value: 'new',
              previous: 'old',
            },
          }
        )
      );
      jest.runAllTimers();

      manager.undo();
      manager.redo();

      expect(model.modifyData).toHaveBeenCalledWith(
        USER_ID,
        index,
        {
          value: 'new',
          previous: 'old',
        }
      );
    });

    it('should flush the current batch (from an undo triggered mid-typing) and then redo', () => {
      const index = createIndex({ textRange: [0, 0] });

      // User starts typing – batch accumulates but debounce has NOT fired yet
      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Added,
          {
            index,
            data: 'a',
          }
        )
      );

      // User presses Cmd+Z immediately (undo flushes the pending batch)
      manager.undo();

      // Now redo() should flush any leftover batch (empty here) and re-apply
      manager.redo();

      expect(model.insertData).toHaveBeenCalledWith(USER_ID, index, 'a');
    });

    it('should push the inverse events back to the undo stack so they can be undone again', () => {
      const index = createIndex({ textRange: [0, 0] });

      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Added,
          {
            index,
            data: 'a',
          }
        )
      );
      jest.runAllTimers();

      manager.undo(); // removeData × 1
      manager.redo(); // insertData × 1
      manager.undo(); // removeData × 2

      expect(model.removeData).toHaveBeenCalledTimes(2);
    });
  });

  describe('event handling', () => {
    it('should ignore events from other users', () => {
      fireModelEvent(modelChangedListener, createPayload(EventAction.Added, { userId: OTHER_USER_ID }));
      jest.runAllTimers();

      manager.undo();

      expect(model.removeData).not.toHaveBeenCalled();
    });

    it('should clear the redo stack when a new event is received', () => {
      const index = createIndex({ textRange: [0, 0] });

      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Added,
          {
            index,
            data: 'a',
          }
        )
      );
      jest.runAllTimers();

      manager.undo(); // 'a' is now in redo stack

      // New user action – must clear the redo stack
      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Added,
          {
            index: createIndex({
              blockIndex: 1,
              textRange: [0, 0],
            }),
            data: 'b',
          }
        )
      );
      jest.runAllTimers();

      manager.redo(); // redo stack should be empty

      expect(model.insertData).not.toHaveBeenCalled();
    });
  });

  describe('batching', () => {
    it('should batch consecutive Added events at sequential character positions', () => {
      // 'a' at [0,0], next char must start at lastRange[1] + len('a') = 0 + 1 = 1
      const index1 = createIndex({ textRange: [0, 0] });
      const index2 = createIndex({ textRange: [1, 1] });

      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Added,
          {
            index: index1,
            data: 'a',
          }
        )
      );
      endTask();
      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Added,
          {
            index: index2,
            data: 'b',
          }
        )
      );
      endTask();
      jest.runAllTimers();

      manager.undo(); // both events should be undone in a single step

      expect(model.removeData).toHaveBeenCalledTimes(2);
    });

    it('should NOT batch Added events at non-sequential positions', () => {
      const index1 = createIndex({ textRange: [0, 0] });
      const index2 = createIndex({ textRange: [5, 5] }); // gap – not consecutive

      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Added,
          {
            index: index1,
            data: 'a',
          }
        )
      );
      endTask();
      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Added,
          {
            index: index2,
            data: 'b',
          }
        )
      );
      endTask();
      jest.runAllTimers();

      manager.undo(); // only the second event

      expect(model.removeData).toHaveBeenCalledTimes(1);
      model.removeData.mockClear();

      manager.undo(); // now the first event

      expect(model.removeData).toHaveBeenCalledTimes(1);
    });

    it('should NOT batch a Modified event with preceding text events', () => {
      const addedIndex = createIndex({ textRange: [0, 0] });
      const modifiedIndex = createIndex({
        isTextIndex: false,
        textRange: undefined,
      });

      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Added,
          {
            index: addedIndex,
            data: 'a',
          }
        )
      );
      endTask();
      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Modified,
          {
            index: modifiedIndex,
            data: {
              value: 'new',
              previous: 'old',
            },
          }
        )
      );
      endTask();
      jest.runAllTimers();

      // First undo targets the Modified event (on top of the stack)
      manager.undo();

      expect(model.modifyData).toHaveBeenCalledTimes(1);
      expect(model.removeData).not.toHaveBeenCalled();
    });

    it('should NOT batch events with different actions', () => {
      const index1 = createIndex({ textRange: [0, 0] });
      const index2 = createIndex({ textRange: [1, 1] });

      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Added,
          {
            index: index1,
            data: 'a',
          }
        )
      );
      endTask();
      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Removed,
          {
            index: index2,
            data: 'b',
          }
        )
      );
      endTask();
      jest.runAllTimers();

      // First undo should only undo the Removed event (top of stack)
      manager.undo();

      expect(model.insertData).toHaveBeenCalledTimes(1);
      expect(model.removeData).not.toHaveBeenCalled();
    });

    it('should NOT batch events from different block indices', () => {
      const index1 = createIndex({
        blockIndex: 0,
        textRange: [0, 0],
      });
      const index2 = createIndex({
        blockIndex: 1,
        textRange: [1, 1],
      });

      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Added,
          {
            index: index1,
            data: 'a',
          }
        )
      );
      endTask();
      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Added,
          {
            index: index2,
            data: 'b',
          }
        )
      );
      endTask();
      jest.runAllTimers();

      manager.undo();

      expect(model.removeData).toHaveBeenCalledTimes(1);
    });

    it('should NOT batch events with different data keys', () => {
      const index1 = createIndex({
        dataKey: 'text',
        textRange: [0, 0],
      });
      const index2 = createIndex({
        dataKey: 'caption',
        textRange: [1, 1],
      });

      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Added,
          {
            index: index1,
            data: 'a',
          }
        )
      );
      endTask();
      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Added,
          {
            index: index2,
            data: 'b',
          }
        )
      );
      endTask();
      jest.runAllTimers();

      manager.undo();

      expect(model.removeData).toHaveBeenCalledTimes(1);
    });

    it('should NOT batch events on non-text indices', () => {
      const index1 = createIndex({
        isTextIndex: false,
        textRange: undefined,
      });
      const index2 = createIndex({
        isTextIndex: false,
        textRange: undefined,
      });

      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Added,
          {
            index: index1,
            data: 'a',
          }
        )
      );
      endTask();
      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Added,
          {
            index: index2,
            data: 'b',
          }
        )
      );
      endTask();
      jest.runAllTimers();

      manager.undo();

      expect(model.removeData).toHaveBeenCalledTimes(1);
    });

    it('should batch consecutive Removed events at the same start position (forward Delete)', () => {
      // Pressing Delete repeatedly keeps the cursor at the same position
      const index1 = createIndex({ textRange: [0, 1] });
      const index2 = createIndex({ textRange: [0, 1] }); // newRange[0] === lastRange[0] ✓

      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Removed,
          {
            index: index1,
            data: 'a',
          }
        )
      );
      endTask();
      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Removed,
          {
            index: index2,
            data: 'b',
          }
        )
      );
      endTask();
      jest.runAllTimers();

      manager.undo();

      expect(model.insertData).toHaveBeenCalledTimes(2);
    });

    it('should batch consecutive Removed events at decreasing positions (Backspace)', () => {
      // Pressing Backspace: newRange[1] === lastRange[0]
      const index1 = createIndex({ textRange: [1, 2] });
      const index2 = createIndex({ textRange: [0, 1] }); // newRange[1]=1 === lastRange[0]=1 ✓

      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Removed,
          {
            index: index1,
            data: 'b',
          }
        )
      );
      endTask();
      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Removed,
          {
            index: index2,
            data: 'a',
          }
        )
      );
      endTask();
      jest.runAllTimers();

      manager.undo();

      expect(model.insertData).toHaveBeenCalledTimes(2);
    });

    it('should flush the batch to the undo stack after the debounce timeout', () => {
      const index = createIndex({ textRange: [0, 0] });

      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Added,
          {
            index,
            data: 'a',
          }
        )
      );
      endTask();

      jest.runAllTimers(); // debounce fires → batch pushed to undoStack

      manager.undo();

      expect(model.removeData).toHaveBeenCalledWith(USER_ID, index, 'a');
    });

    it('should restart the debounce timer on each new event', () => {
      const index1 = createIndex({ textRange: [0, 0] });
      const index2 = createIndex({ textRange: [1, 1] });

      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Added,
          {
            index: index1,
            data: 'a',
          }
        )
      );
      endTask();

      // Advance to 400 ms – timer has not fired yet (fires at 500 ms)
      jest.advanceTimersByTime(400);

      // Second event resets the timer
      fireModelEvent(
        modelChangedListener,
        createPayload(
          EventAction.Added,
          {
            index: index2,
            data: 'b',
          }
        )
      );
      endTask();

      // Advance another 400 ms – total 800 ms but timer was reset at 400 ms, fires at 900 ms
      jest.advanceTimersByTime(400);

      // Batch has NOT been flushed automatically yet; undo() will flush it
      manager.undo();

      // Both events must be undone in one step (same batch)
      expect(model.removeData).toHaveBeenCalledTimes(2);
    });
  });

  describe('block events', () => {
    const blockIndex = (): object => Object.assign(new (BlockIndex as unknown as new () => object)(), { blockIndex: 1 });
    const block = {
      id: 'block-1',
      name: 'paragraph',
      data: {},
    };

    it('should pass a block-level Added event\'s block as a one-item array when undoing', () => {
      const index = blockIndex();

      fireModelEvent(modelChangedListener, createPayload(EventAction.Added, { index: index as ReturnType<typeof createIndex>,
        data: block }));

      manager.undo();

      expect(model.removeData).toHaveBeenCalledWith(USER_ID, index, [block]);
    });

    it('should pass a block-level Removed event\'s block as a one-item array when undoing', () => {
      const index = blockIndex();

      fireModelEvent(modelChangedListener, createPayload(EventAction.Removed, { index: index as ReturnType<typeof createIndex>,
        data: block }));

      manager.undo();

      expect(model.insertData).toHaveBeenCalledWith(USER_ID, index, [block]);
    });

    it('should pass a block-level event\'s block as a one-item array when redoing', () => {
      const index = blockIndex();

      fireModelEvent(modelChangedListener, createPayload(EventAction.Added, { index: index as ReturnType<typeof createIndex>,
        data: block }));

      manager.undo();
      manager.redo();

      expect(model.insertData).toHaveBeenCalledWith(USER_ID, index, [block]);
    });

    it('should pass text event data unchanged', () => {
      const index = createIndex({ textRange: [0, 0] });

      fireModelEvent(modelChangedListener, createPayload(EventAction.Added, { index,
        data: 'a' }));

      manager.undo();

      expect(model.removeData).toHaveBeenCalledWith(USER_ID, index, 'a');
    });
  });

  describe('grouping by task', () => {
    const textAt = (start: number, end = start): ReturnType<typeof createIndex> => createIndex({ textRange: [start, end] });
    const blockAt = (blockIndex: number): ReturnType<typeof createIndex> => createIndex({
      isTextIndex: false,
      blockIndex,
      textRange: undefined,
    });

    it('should undo several changes made in one task in a single step', () => {
      fireModelEvent(modelChangedListener, createPayload(EventAction.Removed, { index: textAt(2, 5),
        data: 'llo' }));
      fireModelEvent(modelChangedListener, createPayload(EventAction.Added, { index: blockAt(1),
        data: [] }));
      endTask();
      jest.runAllTimers();

      manager.undo();

      expect(model.removeData).toHaveBeenCalledTimes(1);
      expect(model.insertData).toHaveBeenCalledTimes(1);

      manager.undo();

      expect(model.removeData).toHaveBeenCalledTimes(1);
      expect(model.insertData).toHaveBeenCalledTimes(1);
    });

    it('should undo the events of one task in reverse order', () => {
      const removed = createPayload(EventAction.Removed, { index: textAt(2, 5),
        data: 'llo' });
      const added = createPayload(EventAction.Added, { index: blockAt(1),
        data: [] });
      const calls: string[] = [];

      model.removeData = jest.fn(() => calls.push('removeData'));
      model.insertData = jest.fn(() => calls.push('insertData'));

      fireModelEvent(modelChangedListener, removed);
      fireModelEvent(modelChangedListener, added);
      endTask();

      manager.undo();

      expect(calls).toEqual(['removeData', 'insertData']);
    });

    it('should redo a whole task in a single step', () => {
      fireModelEvent(modelChangedListener, createPayload(EventAction.Removed, { index: textAt(2, 5),
        data: 'llo' }));
      fireModelEvent(modelChangedListener, createPayload(EventAction.Added, { index: blockAt(1),
        data: [] }));
      endTask();
      jest.runAllTimers();

      manager.undo();
      manager.redo();

      expect(model.removeData).toHaveBeenCalledTimes(2);
      expect(model.insertData).toHaveBeenCalledTimes(2);
    });

    it('should keep single keystrokes batched as before', () => {
      fireModelEvent(modelChangedListener, createPayload(EventAction.Added, { index: textAt(0),
        data: 'a' }));
      endTask();
      fireModelEvent(modelChangedListener, createPayload(EventAction.Added, { index: textAt(1),
        data: 'b' }));
      endTask();
      jest.runAllTimers();

      manager.undo();

      expect(model.removeData).toHaveBeenCalledTimes(2);
    });

    it('should keep typing before a multi-change task as a separate step', () => {
      const typed = createPayload(EventAction.Added, { index: textAt(0),
        data: 'a' });

      fireModelEvent(modelChangedListener, typed);
      endTask();

      /**
       * The first event of the task would continue the typed text on its own
       */
      fireModelEvent(modelChangedListener, createPayload(EventAction.Added, { index: textAt(1),
        data: 'b' }));
      fireModelEvent(modelChangedListener, createPayload(EventAction.Added, { index: blockAt(1),
        data: [] }));
      endTask();
      jest.runAllTimers();

      manager.undo();

      expect(model.removeData).toHaveBeenCalledTimes(2);
      expect(model.removeData).not.toHaveBeenCalledWith(USER_ID, typed.index, 'a');

      manager.undo();

      expect(model.removeData).toHaveBeenLastCalledWith(USER_ID, typed.index, 'a');
    });

    it('should start a new step for typing after a task that ended with a block change', () => {
      fireModelEvent(modelChangedListener, createPayload(EventAction.Removed, { index: textAt(2, 5),
        data: 'llo' }));
      fireModelEvent(modelChangedListener, createPayload(EventAction.Added, { index: blockAt(1),
        data: [] }));
      endTask();

      const typed = createPayload(EventAction.Added, { index: textAt(0),
        data: 'x' });

      fireModelEvent(modelChangedListener, typed);
      endTask();
      jest.runAllTimers();

      manager.undo();

      expect(model.removeData).toHaveBeenCalledTimes(1);
      expect(model.removeData).toHaveBeenCalledWith(USER_ID, typed.index, 'x');
      expect(model.insertData).not.toHaveBeenCalled();
    });

    it('should merge typing that continues a replace-selection task into its step', () => {
      fireModelEvent(modelChangedListener, createPayload(EventAction.Removed, { index: textAt(0, 3),
        data: 'abc' }));
      fireModelEvent(modelChangedListener, createPayload(EventAction.Added, { index: textAt(0),
        data: 'x' }));
      endTask();
      fireModelEvent(modelChangedListener, createPayload(EventAction.Added, { index: textAt(1),
        data: 'y' }));
      endTask();
      jest.runAllTimers();

      manager.undo();

      expect(model.removeData).toHaveBeenCalledTimes(2);
      expect(model.insertData).toHaveBeenCalledTimes(1);
    });

    it('should keep consecutive multi-change tasks as separate steps', () => {
      fireModelEvent(modelChangedListener, createPayload(EventAction.Added, { index: blockAt(1),
        data: [] }));
      fireModelEvent(modelChangedListener, createPayload(EventAction.Added, { index: blockAt(2),
        data: [] }));
      endTask();
      fireModelEvent(modelChangedListener, createPayload(EventAction.Added, { index: blockAt(3),
        data: [] }));
      fireModelEvent(modelChangedListener, createPayload(EventAction.Added, { index: blockAt(4),
        data: [] }));
      endTask();
      jest.runAllTimers();

      manager.undo();

      expect(model.removeData).toHaveBeenCalledTimes(2);
    });

    it('should record buffered events before undo when the task has not ended', () => {
      fireModelEvent(modelChangedListener, createPayload(EventAction.Removed, { index: textAt(2, 5),
        data: 'llo' }));
      fireModelEvent(modelChangedListener, createPayload(EventAction.Added, { index: blockAt(1),
        data: [] }));

      manager.undo();

      expect(model.removeData).toHaveBeenCalledTimes(1);
      expect(model.insertData).toHaveBeenCalledTimes(1);
    });

    it('should record buffered events before redo when the task has not ended', () => {
      fireModelEvent(modelChangedListener, createPayload(EventAction.Added, { index: blockAt(1),
        data: [] }));
      endTask();
      jest.runAllTimers();
      manager.undo();

      /**
       * A new local change clears the redo stack, even if its task has not ended yet
       */
      fireModelEvent(modelChangedListener, createPayload(EventAction.Added, { index: blockAt(2),
        data: [] }));

      manager.redo();
      manager.undo();

      expect(model.insertData).not.toHaveBeenCalled();
      expect(model.removeData).toHaveBeenCalledTimes(2);
    });

    it('should ignore remote events while a task is buffered', () => {
      fireModelEvent(modelChangedListener, createPayload(EventAction.Added, { index: blockAt(1),
        data: ['local-1'] }));
      fireModelEvent(modelChangedListener, createPayload(EventAction.Added, { index: blockAt(2),
        data: ['remote'],
        userId: OTHER_USER_ID }));
      fireModelEvent(modelChangedListener, createPayload(EventAction.Added, { index: blockAt(3),
        data: ['local-2'] }));
      endTask();

      manager.undo();

      expect(model.removeData).toHaveBeenCalledTimes(2);
      expect(model.removeData).not.toHaveBeenCalledWith(USER_ID, expect.anything(), ['remote']);
    });
  });
});
