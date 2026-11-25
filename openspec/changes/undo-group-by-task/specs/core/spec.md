## MODIFIED Requirements

### Requirement: Local undo/redo
The system SHALL provide `UndoRedoManager`, which batches consecutive model events (debounced) into a single undo step, inverts `Added`/`Removed`/`Modified` events on `undo()`, and responds to cancellable `core:undo`/`core:redo` events. Local events SHALL be grouped by the browser task in which they were dispatched. When a task produced exactly one local event, that event is batched by the existing rule (consecutive text insert/remove in the same input). When a task produced more than one local event, the open batch is closed and the task's events start a new batch together. `UndoRedoManager` SHALL be the model's first `Changed` listener, so the events of a step are recorded in the order the model applied them, including changes that other listeners make while an event is dispatched.

#### Scenario: In-progress batch flushed before undo
- **GIVEN** an undo step is mid-batch when `undo()` is triggered
- **WHEN** the undo is processed
- **THEN** the in-progress batch is flushed first, and the manager ignores model events it triggers itself while replaying the undo

#### Scenario: Cancellable undo/redo events
- **GIVEN** a listener calls `preventDefault()` (or equivalent cancellation) on a `core:undo`/`core:redo` event
- **WHEN** the event is dispatched
- **THEN** the default undo/redo behavior is suppressed

#### Scenario: Several changes in one task are one undo step
- **GIVEN** the local user's action makes several model changes synchronously in one task, for example removing text, splitting a block and inserting blocks
- **WHEN** the task has ended and `undo()` is called once
- **THEN** every change made in that task is reverted, and the document equals its state before the task

#### Scenario: Redo re-applies the whole task
- **GIVEN** a multi-change task's step has just been undone
- **WHEN** `redo()` is called once
- **THEN** every change of that task is re-applied without errors, and the document equals its state right after the task

#### Scenario: Splitting a block with Enter is one undo step
- **GIVEN** the caret is in the middle of a paragraph and the user presses Enter, which splits the block
- **WHEN** `undo()` is called once
- **THEN** the paragraph is restored to its single-block state, with no intermediate step that has only the text removed

#### Scenario: Typing keeps its current batching
- **GIVEN** the local user types several characters, each keystroke in its own task, within the debounce window
- **WHEN** `undo()` is called once
- **THEN** all of those characters are removed together, as before this change

#### Scenario: Earlier typing stays a separate step
- **GIVEN** the local user typed text less than 500 ms before a task that makes several changes, so that text is still in the open batch
- **WHEN** that task ends and `undo()` is later called once
- **THEN** only the task's changes are reverted, and the typed text stays

#### Scenario: Typing after a block-level action starts a new step
- **GIVEN** a task that made several changes and ended with a block change (for example `BlockAdded`) has just finished
- **WHEN** the local user types text within 500 ms and `undo()` is called once
- **THEN** only the typed text is reverted, and the earlier task's changes stay

#### Scenario: Consecutive multi-change tasks are separate steps
- **GIVEN** two tasks run one after the other, each making several changes
- **WHEN** `undo()` is called once
- **THEN** only the second task's changes are reverted

#### Scenario: Undo before the current task has ended
- **GIVEN** local events of the current task are still buffered because the task has not ended
- **WHEN** `undo()` is called
- **THEN** the buffered events are recorded first, following the same one-event and several-event rules, and the most recent step is then undone

#### Scenario: Block construction events are not recorded separately
- **GIVEN** a block with text data is added as part of a multi-change task
- **WHEN** that task is undone and then redone
- **THEN** the block is removed and re-added with its data exactly once, with no `AlreadyExistingKeyError`, because the microtask-dispatched `DataNodeAddedEvent`s from block construction are not recorded as undoable changes

#### Scenario: Undoing a block removal keeps redo available
- **GIVEN** a step that removed a block with text data
- **WHEN** that step is undone, the microtasks queued while re-adding the block have run, and `redo()` is called
- **THEN** the block is removed again, because the `DataNodeAddedEvent`s from re-adding the block were not recorded as a new step and did not clear the redo stack

#### Scenario: Several plugin-data writes in one task are one undo step
- **GIVEN** the local user's action writes plugin data several times in one task, for example by calling `updatePluginData` for two keys
- **WHEN** the task ends and `undo()` is called once
- **THEN** all of those writes are reverted together, not only the last one

#### Scenario: Undoing and redoing a block change
- **GIVEN** a recorded step contains a `BlockAddedEvent` or `BlockRemovedEvent`, whose `data` is a single serialized block
- **WHEN** the step is undone or redone
- **THEN** the manager calls the model's `insertData`/`removeData` with that block wrapped in a one-item list, as the model expects for a `BlockIndex`, and the block is removed or restored without errors

#### Scenario: Remote events do not join a local task
- **GIVEN** a remote user's event arrives while local events of the current task are buffered
- **WHEN** the manager handles it
- **THEN** the event is ignored, as for any remote event, and the local task's grouping is unaffected

#### Scenario: Changes made synchronously by a model listener join the task
- **GIVEN** a `Changed` listener on the model, such as the `onModelUpdate` callback, reacts to a local event by changing the model as the local user, synchronously during dispatch
- **WHEN** the task ends and `undo()` is called once
- **THEN** the user's changes and the listener's changes are reverted together, as one step

#### Scenario: Listener changes are undone in reverse of the order they were applied
- **GIVEN** `onModelUpdate` reacts to a local text insert by synchronously inserting text earlier in the same input, which shifts the offsets of the user's text
- **WHEN** `undo()` is called once
- **THEN** the listener's insert is reverted first and the user's insert second, each at the offsets where it was applied, and the document equals its state before the user's change

#### Scenario: The undo manager is the model's first Changed listener
- **GIVEN** Core is constructed with `onModelUpdate`, and plugins or tools subscribe to the model's `Changed` events
- **WHEN** the model dispatches a `Changed` event
- **THEN** `UndoRedoManager` receives it before `onModelUpdate` and before any plugin or tool listener, while its `core:undo`/`core:redo` listeners are still registered after plugins

#### Scenario: Changes made by a model listener in a microtask join the task
- **GIVEN** a `Changed` listener reacts to a local event by changing the model as the local user in a microtask (for example after `await`)
- **WHEN** the task ends and `undo()` is called once
- **THEN** the listener's changes are reverted in the same step as the user's changes, because microtasks run before the task-end timer

#### Scenario: Changes made by a model listener in a later task are a separate step
- **GIVEN** a `Changed` listener reacts to a local event by changing the model as the local user in a later task, for example in a `setTimeout(0)`
- **WHEN** `undo()` is called once
- **THEN** only the listener's changes are reverted, and the user's changes stay as the previous step

#### Scenario: The debounce expires while a task is buffered
- **GIVEN** the open batch's debounce timer expires while a local event of the current task is still buffered
- **WHEN** the task ends
- **THEN** the open batch is recorded as its own step, the buffered event starts a new batch, and no event is lost or recorded twice

#### Scenario: The debounce window restarts when a task is recorded
- **GIVEN** a task's events have just been added to the open batch
- **WHEN** less than 500 ms pass without another local task
- **THEN** the batch stays open, and it is recorded as a step 500 ms after the last task that added to it, not 500 ms after the batch's first event

#### Scenario: Undo with both timers pending
- **GIVEN** local events of the current task are buffered and the open batch's debounce timer is pending
- **WHEN** `undo()` is called
- **THEN** the buffered events are recorded first, then the open batch is closed and undone, and neither timer records anything when it would have fired

#### Scenario: Destroy cancels pending timers
- **GIVEN** a task-end timer or a debounce timer is pending
- **WHEN** `destroy()` is called
- **THEN** both timers are cleared, and no step is recorded afterwards

Implemented in `src/components/UndoRedoManager.ts` (and where `src/index.ts` creates it), validated by its co-located `.spec.ts` and an integration test through `Core`.
