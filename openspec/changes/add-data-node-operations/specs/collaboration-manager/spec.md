## ADDED Requirements

### Requirement: Data node and value operations
The system SHALL convert a `DataNodeAddedEvent` that is not an initialization event into an `Insert` operation, a `DataNodeRemovedEvent` into a `Delete` operation, and a `ValueModifiedEvent` into a `Modify` operation, each addressed by the event's `DataIndex`. Insert and Delete SHALL carry the removed or added subtree as a one-element `payload` array. Modify SHALL carry the new value as `payload` and the previous value as `prevPayload`, where either may be any JSON value. The system SHALL ignore `DataNodeAddedEvent`s marked as initialization events: it creates no operation, records nothing for undo, and does not transform the undo/redo stacks against them. `applyOperation` and `ot-server` SHALL convert an operation to model data through one shared helper that unwraps the one-element payload of a `DataIndex` Insert/Delete.

#### Scenario: Local value change is sent and recorded
- **GIVEN** the local user calls `updateValue` for key `items.1.checked` on block 0, changing `false` to `true`
- **WHEN** `CollaborationManager` handles the resulting `ValueModifiedEvent`
- **THEN** it sends a `Modify` operation on `DataIndex(0, 'items.1.checked')` with `payload: true` and `prevPayload: false`, and records it as an undo step

#### Scenario: Local array element insert is sent
- **GIVEN** the local user creates a data node at `items.1` of block 0, whose `items` is an array
- **WHEN** `CollaborationManager` handles the resulting `DataNodeAddedEvent`
- **THEN** it sends an `Insert` operation on `DataIndex(0, 'items.1')` whose `payload` is a one-element array holding the serialized element

#### Scenario: Initialization events produce no operation
- **GIVEN** a block is added, locally or by a remote operation
- **WHEN** the `DataNodeAddedEvent`s dispatched during its construction reach `CollaborationManager`
- **THEN** no operation is sent, nothing is added to the undo stack, and the undo/redo stacks are not transformed

#### Scenario: Remote data operations are applied
- **GIVEN** a remote `Insert`, `Delete` or `Modify` operation on a `DataIndex`
- **WHEN** `applyOperation` is called with it
- **THEN** the model contains, or no longer contains, the subtree or value at that key, exactly as on the author's client

### Requirement: Array position transformation
The system SHALL treat a data-key segment that is a non-negative integer as an array position. When an operation is transformed against an Insert or Delete on a `DataIndex` at `P.i` in the same block, the system SHALL rewrite the position segment of any data or text operation whose key is `P.j` or lies under `P.j`:
- an Insert at `P.i` shifts `j ≥ i` to `j+1`;
- a Delete at `P.i` shifts `j > i` to `j−1`, and turns operations at or under `P.i` into `Neutral`, except an Insert at exactly `P.i`, which stays unchanged.

For two Inserts at exactly the same position, the operation being transformed SHALL shift iff the other operation comes earlier in the transform order (`againstIsLater` is false). A Delete of a key whose last segment is not an integer SHALL turn every operation at or under that key into `Neutral`, except an `Insert` or `Modify` at exactly that key.

#### Scenario: Text edit inside a shifted element
- **GIVEN** a text insert on `TextIndex` with `dataKey: 'items.3.content'` in block 0
- **WHEN** it is transformed against an Insert on `DataIndex(0, 'items.1')`
- **THEN** its `dataKey` becomes `items.4.content`, and its block index, text range and payload are unchanged

#### Scenario: Value change before the deleted element is not affected
- **GIVEN** a `Modify` on `DataIndex(0, 'items.0.depth')`
- **WHEN** it is transformed against a Delete on `DataIndex(0, 'items.2')`
- **THEN** it is returned unchanged

#### Scenario: Value change inside a deleted element
- **GIVEN** a `Modify` on `DataIndex(0, 'items.2.checked')`
- **WHEN** it is transformed against a Delete on `DataIndex(0, 'items.2')`
- **THEN** it becomes `Neutral`

#### Scenario: Deleting the same element twice
- **GIVEN** two concurrent Deletes on `DataIndex(0, 'items.2')`
- **WHEN** the second one is transformed against the first
- **THEN** it becomes `Neutral`

#### Scenario: Concurrent inserts at the same position converge
- **GIVEN** clients X and Y both insert an element at `items.1` of block 0 at the same revision, and the server processes Y's operation first
- **WHEN** the server transforms X's operation against Y's, and client X transforms Y's broadcast operation against its pending operation
- **THEN** the server and both clients hold Y's element at `items.1` and X's element at `items.2`

#### Scenario: Operations in another array or block are not shifted
- **GIVEN** an operation on key `rows.3` in block 0, or on `items.3` in block 1
- **WHEN** it is transformed against an Insert on `DataIndex(0, 'items.1')`
- **THEN** it is returned unchanged

### Requirement: Same-key and overlapping data write conflicts
The system SHALL treat a `Modify` operation, and an `Insert` operation on a data key whose last segment is not an integer, as a write that replaces whatever is at its key. Two keys overlap when they are equal or one is a prefix of the other by whole segments, compared after array positions are shifted.

For two writes on the same block and data key, the operation being transformed SHALL become `Neutral` iff the other operation comes later (`againstIsLater` is true). Otherwise it SHALL be returned unchanged, to be applied after the other one.

An operation of any kind under the key of a write in the same block SHALL become `Neutral` when transformed against that write, whatever the order. A write transformed against an operation under its key SHALL be returned unchanged.

When the key's last segment is not an integer, a `Delete` or a text operation at exactly the key of a write in the same block SHALL become `Neutral` when transformed against that write, whatever the order, and the write transformed against it SHALL be returned unchanged. When the last segment is an integer, same-key conflicts follow the array position rules.

#### Scenario: Concurrent value changes converge on the later write
- **GIVEN** clients X and Y both modify `items.0.depth` of block 0 at the same revision, and the server processes Y's operation first
- **WHEN** the server transforms X's operation against Y's, and client X transforms Y's broadcast operation against its pending operation
- **THEN** the server and both clients end with X's value

#### Scenario: Replacing an object wins over a concurrent write inside it
- **GIVEN** client X inserts `meta` as `{ url: 'a' }` and client Y inserts `meta.url` as `'b'` in block 0, at the same revision
- **WHEN** the server processes the two operations in either order, and each client transforms the other's broadcast operation against its pending operation
- **THEN** the server and both clients end with `meta` equal to `{ url: 'a' }`

#### Scenario: Re-creating a key wins over a concurrent delete of it
- **GIVEN** client X inserts `meta` as `{ url: 'a' }` and client Y deletes `meta` in block 0, at the same revision
- **WHEN** the server processes the two operations in either order, and each client transforms the other's broadcast operation against its pending operation
- **THEN** the server and both clients end with `meta` equal to `{ url: 'a' }`

#### Scenario: Value change at a deleted key is kept
- **GIVEN** a `Modify` on `DataIndex(0, 'meta')` and a concurrent `Delete` on `DataIndex(0, 'meta')`
- **WHEN** each is transformed against the other
- **THEN** the `Modify` is returned unchanged and the `Delete` becomes `Neutral`

#### Scenario: Text edit at a replaced key
- **GIVEN** a text insert on `TextIndex` with `dataKey: 'caption'` and a concurrent `Insert` on `DataIndex(0, 'caption')` in block 0
- **WHEN** each is transformed against the other, earlier or later
- **THEN** the text insert becomes `Neutral` and the `Insert` is returned unchanged

#### Scenario: Text edit inside a replaced object
- **GIVEN** a text insert on `TextIndex` with `dataKey: 'meta.caption'` in block 0
- **WHEN** it is transformed against an `Insert` on `DataIndex(0, 'meta')`, earlier or later
- **THEN** it becomes `Neutral`

#### Scenario: Sibling keys do not overlap
- **GIVEN** a `Modify` on `DataIndex(0, 'metadata')`
- **WHEN** it is transformed against an `Insert` on `DataIndex(0, 'meta')`
- **THEN** it is returned unchanged

### Requirement: Undo and redo of data operations
The system SHALL undo a recorded data-node Insert by deleting that node, a data-node Delete by re-inserting the recorded subtree at its key, and a value Modify by restoring `prevPayload`. Redo SHALL re-apply the original. Each data operation SHALL be its own undo step, and the undo/redo stacks SHALL be transformed against remote data operations under the same rules as any other remote operation.

#### Scenario: Undoing an item indent
- **GIVEN** the local user changed `items.1.depth` from `0` to `1`
- **WHEN** `undo()` is called
- **THEN** `items.1.depth` is `0` again and the inverse `Modify` is sent to the server, and a following `redo()` sets it back to `1`

#### Scenario: Undoing an item removal
- **GIVEN** the local user removed the data node at `items.2`
- **WHEN** `undo()` is called
- **THEN** the removed element, including its text content, is inserted back at `items.2` and later elements shift back by one

#### Scenario: Undo stack follows a remote insert
- **GIVEN** the undo stack holds a local `Modify` on `items.2.checked`
- **WHEN** a remote Insert on `items.0` of the same block arrives and `undo()` is called
- **THEN** the undo restores `prevPayload` on `items.3.checked`

#### Scenario: Undoing two inserts after a remote insert between them
- **GIVEN** the local user inserted element L1 at `items.0` of block 0, then element L2 at `items.0` as a separate step, giving `[L2, L1]`
- **WHEN** a remote Insert of element R at `items.1` arrives, giving `[L2, R, L1]`, and `undo()` is called twice
- **THEN** the first undo removes L2 and the second removes L1, leaving `[R]`

## MODIFIED Requirements

### Requirement: Undo/redo stack rebasing against remote edits
The system SHALL maintain local undo/redo stacks (`UndoRedoManager`) and rebase (`transformStacks()`) them against incoming remote operations, dropping stack entries that become Neutral as a result. Each entry SHALL be rebased in the document it was recorded in: each stack is processed from the newest entry to the oldest, and the remote operation is carried back past each entry, by transforming it against the entry's inverse with `againstIsLater: true`, before the next older entry is rebased against it. Once the carried operation becomes Neutral, older entries SHALL be left unchanged. The operations inside a batch entry SHALL be rebased the same way, in the order they apply.

#### Scenario: Undo scope depends on overlap with remote edits
- **GIVEN** a local edit "world" was typed and debounced (committed to the undo stack)
- **WHEN** a remote insert of "hello" at index 0 arrives before the local user calls `undo()`
- **THEN** `undo()` removes only "world", leaving "hello" — because the stacks were rebased against the remote operation before the undo was applied

#### Scenario: Undo scope narrows when a remote edit lands inside a char-by-char batch
- **GIVEN** a local batch built from individual character inserts
- **WHEN** a remote insert lands inside that batch's range
- **THEN** only the portion of the batch not affected by the remote insert is undone

#### Scenario: Undo scope covers the whole insert when unbatched
- **GIVEN** a single (non-batched) local insert operation
- **WHEN** a remote insert lands inside its range
- **THEN** the entire local insert is undone as one unit

#### Scenario: Older entries are rebased in their own document
- **GIVEN** the local user typed `a` into an empty paragraph, then typed `b` at position 0 as a separate undo step, giving `ba`
- **WHEN** a remote insert of `R` at position 1 arrives, giving `bRa`, and `undo()` is called twice
- **THEN** the first undo removes `b` and the second removes `a`, leaving `R`

#### Scenario: Redo after a remote edit
- **GIVEN** the two undos of the previous scenario, leaving `R`
- **WHEN** a remote insert of `S` at position 1 arrives, giving `RS`, and `redo()` is called twice
- **THEN** the text is `bRSa`
