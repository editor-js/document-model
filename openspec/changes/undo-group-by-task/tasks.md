## 1. Tests first (UndoRedoManager unit)

- [x] 1.1 Use Jest fake timers in `packages/core/src/components/UndoRedoManager.spec.ts` and add an `endTask()` helper. Existing tests that fire several events to model *separate* user actions now end the task between them; previously they relied on every event being judged individually
- [x] 1.2 Write failing tests for the core spec scenarios:
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

## 2. Implementation

- [x] 2.1 Add `#taskEvents`, `#taskTimer` and `#closeTask()` to `UndoRedoManager`, and route local events through the buffer (design D1, D3). Keep clearing `#redoStack` when each event arrives
- [x] 2.2 Apply the one-event and several-event rules in `#closeTask()` (design D2)
- [x] 2.3 Call `#closeTask()` from `undo()` and `redo()` before `#putBatchToUndo()`, and clear `#taskTimer` in `destroy()` (design D4)
- [x] 2.4 Write failing tests for re-applying block events (undo of Added and Removed, redo), then wrap a block event's data in a one-item list in `#apply` (design D5)
- [x] 2.5 Run `yarn test`, `yarn lint` and `yarn test:mutations` (if configured) in `packages/core`

## 3. Integration tests (real model and BlocksManager)

- [x] 3.1 should undo a mid-paragraph Enter split in one step
- [x] 3.2 should undo and redo a multi-change task that adds a block with text without AlreadyExistingKeyError. Its comment should explain why block-construction `DataNodeAddedEvent`s must stay out of undo (design R2)

## 4. Docs and wrap-up

- [x] 4.1 Update `docs/diagrams/undo-redo-flow.mmd` with the task buffering step in core's undo manager
- [x] 4.2 Note in `docs/collaboration.md` that `collaboration-manager` undo does not group by task yet
- [ ] 4.3 Run `yarn lint` and `yarn test` from the repo root
- [ ] 4.4 Run `openspec validate undo-group-by-task --type change` and fix any issues
