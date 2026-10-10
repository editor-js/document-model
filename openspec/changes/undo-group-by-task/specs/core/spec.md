## MODIFIED Requirements

### Requirement: Local undo/redo
The system SHALL provide `UndoRedoManager`, which batches consecutive model events (debounced) into a single undo step, inverts `Added`/`Removed`/`Modified` events on `undo()`, and responds to cancellable `core:undo`/`core:redo` events. Local events SHALL be grouped by the browser task in which they were dispatched. When a task produced exactly one local event, that event is batched by the existing rule (consecutive text insert/remove in the same input). When a task produced more than one local event, the open batch is closed and the task's events start a new batch together.

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

#### Scenario: Undoing and redoing a block change
- **GIVEN** a recorded step contains a `BlockAddedEvent` or `BlockRemovedEvent`, whose `data` is a single serialized block
- **WHEN** the step is undone or redone
- **THEN** the manager calls the model's `insertData`/`removeData` with that block wrapped in a one-item list, as the model expects for a `BlockIndex`, and the block is removed or restored without errors

#### Scenario: Remote events do not join a local task
- **GIVEN** a remote user's event arrives while local events of the current task are buffered
- **WHEN** the manager handles it
- **THEN** the event is ignored, as for any remote event, and the local task's grouping is unaffected

#### Scenario: Destroy cancels pending timers
- **GIVEN** a task-end timer or a debounce timer is pending
- **WHEN** `destroy()` is called
- **THEN** both timers are cleared, and no step is recorded afterwards

Implemented in `src/components/UndoRedoManager.ts`, validated by its co-located `.spec.ts` and an integration test through `Core`.
