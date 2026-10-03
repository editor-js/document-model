## MODIFIED Requirements

### Requirement: EditorAPI surface
The system SHALL expose an `EditorAPI` aggregating `BlocksAPI` (insert/insertMany/delete/move/render/clear/getBlocksCount), `SelectionAPI` (applyInlineTool, selectedBlocks), `DocumentAPI` (serialized data, onUpdate, insertData/removeData/modifyData, undo/redo, group), and `TextAPI` (insert/remove/format/unformat/getFragments/get) to tools, plugins, and adapters.

#### Scenario: Deleting with no block selected
- **GIVEN** no block is currently selected/no caret is set
- **WHEN** `BlocksAPI.delete()` or `move()` is called without an explicit index
- **THEN** it throws an error ("No block selected to delete" / "No block selected to move")

#### Scenario: Splitting or converting with an unknown tool
- **GIVEN** a `splitBlock`/`convertBlock` call references a `dataKey` that doesn't exist, or a source/target tool that isn't registered
- **WHEN** the operation is attempted
- **THEN** it throws an error identifying the missing key or tool

#### Scenario: Grouping delegates to the model
- **GIVEN** a caller invokes `DocumentAPI.group(fn)`
- **WHEN** the call runs
- **THEN** `fn` is executed inside the model's group context (`EditorJSModel.group`), and its return value or thrown error is passed back to the caller

Implemented in `src/api/index.ts`, `src/api/BlocksAPI.ts`, `src/api/SelectionAPI.ts`, `src/api/DocumentAPI/DocumentAPI.ts`, `src/api/TextAPI.ts`, `src/components/BlockManager.ts`, validated by co-located `.spec.ts`/`.integration.spec.ts` files.

### Requirement: Local undo/redo
The system SHALL provide `UndoRedoManager`, which batches consecutive model events (debounced) into a single undo step, inverts `Added`/`Removed`/`Modified` events on `undo()`, and responds to cancellable `core:undo`/`core:redo` events. Batching SHALL respect group ids: an event with a `groupId` joins the current batch only if the batch has the same `groupId`, and an event without one never joins a grouped batch. Ungrouped events are batched by the existing rule (consecutive text insert/remove in the same input).

#### Scenario: In-progress batch flushed before undo
- **GIVEN** an undo step is mid-batch when `undo()` is triggered
- **WHEN** the undo is processed
- **THEN** the in-progress batch is flushed first, and the manager ignores model events it triggers itself while replaying the undo

#### Scenario: Cancellable undo/redo events
- **GIVEN** a listener calls `preventDefault()` (or equivalent cancellation) on a `core:undo`/`core:redo` event
- **WHEN** the event is dispatched
- **THEN** the default undo/redo behavior is suppressed

#### Scenario: A group is one undo step
- **GIVEN** the local user runs `api.document.group(fn)`, where `fn` removes text, splits a block and inserts several blocks
- **WHEN** `undo()` is called once
- **THEN** every change made inside `fn` is reverted, and the document equals its state before `group` was called

#### Scenario: Redo re-applies the whole group
- **GIVEN** a grouped step has just been undone
- **WHEN** `redo()` is called once
- **THEN** every change of the group is re-applied, without errors, and the document equals its state right after `group` returned

#### Scenario: Earlier typing stays a separate step
- **GIVEN** the local user typed text less than 500 ms before a group starts, so that text is still in the open batch
- **WHEN** the group's first event arrives and `undo()` is later called once
- **THEN** only the group's changes are reverted, and the typed text stays

#### Scenario: Later typing starts a new step
- **GIVEN** a group has just finished
- **WHEN** the local user types text within 500 ms and `undo()` is called once
- **THEN** only the typed text is reverted, and the group's changes stay

#### Scenario: Consecutive groups are separate steps
- **GIVEN** two `api.document.group` calls run one after the other
- **WHEN** `undo()` is called once
- **THEN** only the second group's changes are reverted

#### Scenario: Block construction events are not recorded separately
- **GIVEN** a block with text data is added inside a group
- **WHEN** the group is undone and then redone
- **THEN** the block is removed and re-added with its data exactly once, with no `AlreadyExistingKeyError`, because the microtask-dispatched `DataNodeAddedEvent`s from block construction are not recorded as undoable changes

#### Scenario: Remote events do not join a local group
- **GIVEN** a remote user's event arrives while a local group's batch is open
- **WHEN** the manager handles it
- **THEN** the event is ignored, as for any remote event, and the local group's step is unaffected

Implemented in `src/components/UndoRedoManager.ts`, validated by its co-located `.spec.ts`.
