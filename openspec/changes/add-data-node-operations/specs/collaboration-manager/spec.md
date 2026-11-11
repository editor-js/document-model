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

For two Inserts at exactly the same position, the operation being transformed SHALL shift iff the other operation comes earlier in the transform order (`againstIsLater` is false). A Delete of a key whose last segment is not an integer SHALL turn every operation at or under that key into `Neutral`, except an Insert at exactly that key.

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

### Requirement: Same-key data write conflicts
The system SHALL resolve two `Modify` operations on the same block and data key, and two `Insert` operations on the same block and a data key whose last segment is not an integer, by transform order. The operation being transformed SHALL become `Neutral` iff the other operation comes later (`againstIsLater` is true). Otherwise it SHALL be returned unchanged, to be applied after the other one.

#### Scenario: Concurrent value changes converge on the later write
- **GIVEN** clients X and Y both modify `items.0.depth` of block 0 at the same revision, and the server processes Y's operation first
- **WHEN** the server transforms X's operation against Y's, and client X transforms Y's broadcast operation against its pending operation
- **THEN** the server and both clients end with X's value

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
