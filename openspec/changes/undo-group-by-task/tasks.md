## 1. Tests first (UndoRedoManager unit)

- [ ] 1.1 Switch `packages/core/src/components/UndoRedoManager.spec.ts` and `UndoRedoManager.integration.spec.ts` to Jest fake timers where they aren't already, and add an `endTask()` helper that advances them by 0 ms. In existing tests that make several changes in one task and expect separate steps, call `endTask()` between changes that stand for separate user actions (design R4):
  - the "should NOT batch …" unit tests
  - the plugin-data integration tests that call `updatePluginData` several times before `undo()`
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
  - should undo several plugin-data writes made in one task in a single step
- [ ] 1.3 Write tests for the task timer and the debounce working together (design D7):
  - should record the open batch and start a new one when the debounce expires while a task is buffered
  - should keep a batch open until 500 ms after the last task that added to it
  - should record the buffer, then close and undo the open batch, when undo is called with both timers pending, and record nothing when the timers would have fired

## 2. Implementation

- [ ] 2.1 Add `#taskEvents`, `#taskTimer` and `#closeTask()` to `UndoRedoManager`, and route local events through the buffer (design D1, D3). Keep clearing `#redoStack` when each event arrives. Add short JSDoc on `#closeTask()` and where the timer is scheduled: what a task is, why a 0 ms timer marks its end (it runs after the handler and its microtasks, such as `BlockNode`'s `DataNodeAddedEvent`s), why not `queueMicrotask` or `requestAnimationFrame`, and that under a busy main thread two input tasks can land in one buffer (design D3)
- [ ] 2.2 Apply the one-event and several-event rules in `#closeTask()` (design D2)
- [ ] 2.3 Call `#closeTask()` from `undo()` and `redo()` before `#putBatchToUndo()`, and clear `#taskTimer` in `destroy()` (design D4)
- [ ] 2.4 Write failing tests for re-applying block events (undo of Added and Removed, redo), then wrap a block event's data in a one-item list in `#apply` (design D5)
- [ ] 2.5 Make `UndoRedoManager` the model's first `Changed` listener (design D6): create it in Core's constructor before `onModelUpdate` is subscribed, and move its `core:undo`/`core:redo` subscription into a method that `initialize()` calls after plugins, where the manager is created today
- [ ] 2.6 Run `yarn test`, `yarn lint` and `yarn test:mutations` (if configured) in `packages/core`

## 3. Integration tests (real model and BlocksManager)

- [ ] 3.1 should undo a mid-paragraph Enter split in one step
- [ ] 3.2 Write tests that pin why block-construction `DataNodeAddedEvent`s must stay out of undo. Their comments should explain it and name the proper fixes (design R2):
  - should undo and redo a multi-change task that adds a block with text without AlreadyExistingKeyError
  - should keep redo available after undoing a block removal, once the microtasks queued while re-adding the block have run
- [ ] 3.3 Write tests for changes made from `onModelUpdate`, through a Core constructed with that callback (design D6):
  - should undo a listener's synchronous change in the same step as the user's change
  - should undo a listener's microtask change in the same step as the user's change
  - should record a listener's change made in a timer after the task ends as a separate step
  - should undo an index-dependent change made from `onModelUpdate` (text inserted earlier in the same input) and the user's change at the right offsets
  - should deliver model events to the undo manager before `onModelUpdate` and plugin listeners, and still let plugins cancel `core:undo`
- [ ] 3.4 Write tests that pin today's behaviour for listeners that react to an undo (design R6). Their comments should say this is a known limitation, not the wanted behaviour:
  - should not record a listener's synchronous change made while an undo is replayed
  - should clear the redo stack when a listener changes the model in a later task after an undo

## 4. Docs and wrap-up

- [ ] 4.1 Update `docs/diagrams/undo-redo-flow.mmd` with the task buffering step in core's undo manager
- [ ] 4.2 Note in `docs/collaboration.md` that `collaboration-manager` undo does not group by task yet
- [ ] 4.3 Run `yarn lint` and `yarn test` from the repo root
- [ ] 4.4 Run `openspec validate undo-group-by-task --type change` and fix any issues
