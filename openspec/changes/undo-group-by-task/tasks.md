## 1. Tests first (UndoRedoManager unit)

- [ ] 1.1 Switch `packages/core/src/components/UndoRedoManager.spec.ts` to Jest fake timers where it isn't already, and confirm the existing tests still pass unchanged
- [ ] 1.2 Write failing tests for the core spec scenarios:
  - should undo several changes made in one task in a single step
  - should redo a whole task in a single step
  - should keep single keystrokes batched as before
  - should keep typing before a multi-change task as a separate step
  - should start a new step for typing after a task that ended with a block change
  - should merge typing that continues a replace-selection task into its step
  - should keep consecutive multi-change tasks as separate steps
  - should record buffered events before undo when the task has not ended
  - should ignore remote events while a task is buffered
  - should clear the task timer and the debounce timer on destroy
- [ ] 1.3 Write tests for the task timer and the debounce working together (design D7):
  - should record the open batch and start a new one when the debounce expires while a task is buffered
  - should keep a batch open until 500 ms after the last task that added to it
  - should record the buffer, then close and undo the open batch, when undo is called with both timers pending, and record nothing when the timers would have fired

## 2. Implementation

- [ ] 2.1 Add `#taskEvents`, `#taskTimer` and `#closeTask()` to `UndoRedoManager`, and route local events through the buffer (design D1, D3). Keep clearing `#redoStack` when each event arrives
- [ ] 2.2 Apply the one-event and several-event rules in `#closeTask()` (design D2)
- [ ] 2.3 Call `#closeTask()` from `undo()` and `redo()` before `#putBatchToUndo()`, and clear `#taskTimer` in `destroy()` (design D4)
- [ ] 2.4 Write failing tests for re-applying block events (undo of Added and Removed, redo), then wrap a block event's data in a one-item list in `#apply` (design D5)
- [ ] 2.5 Run `yarn test`, `yarn lint` and `yarn test:mutations` (if configured) in `packages/core`

## 3. Integration tests (real model and BlocksManager)

- [ ] 3.1 should undo a mid-paragraph Enter split in one step
- [ ] 3.2 should undo and redo a multi-change task that adds a block with text without AlreadyExistingKeyError. Its comment should explain why block-construction `DataNodeAddedEvent`s must stay out of undo (design R2)
- [ ] 3.3 Write tests for changes made by another `Changed` listener on the model, which stands in for a future `onChange` callback (design D6):
  - should undo a listener's synchronous change in the same step as the user's change
  - should undo a listener's microtask change in the same step as the user's change
  - should record a listener's change made in a timer after the task ends as a separate step
  - should group a listener's `setTimeout(0)` change with the task when that listener is registered before the undo manager
- [ ] 3.4 Write tests that pin today's behaviour for listeners that react to an undo (design R6). Their comments should say this is a known limitation, not the wanted behaviour:
  - should not record a listener's synchronous change made while an undo is replayed
  - should clear the redo stack when a listener changes the model in a later task after an undo

## 4. Docs and wrap-up

- [ ] 4.1 Update `docs/diagrams/undo-redo-flow.mmd` with the task buffering step in core's undo manager
- [ ] 4.2 Note in `docs/collaboration.md` that `collaboration-manager` undo does not group by task yet
- [ ] 4.3 Run `yarn lint` and `yarn test` from the repo root
- [ ] 4.4 Run `openspec validate undo-group-by-task --type change` and fix any issues
