# Collaboration Manager

## Purpose

`@editorjs/collaboration-manager` is a core plugin that listens to document model events, converts them into operational-transformation (OT) `Operation`s, batches rapid local edits for undo/redo, maintains local undo/redo stacks transformed against remote edits, and optionally syncs with a remote OT server over WebSocket using a handshake + serialized-ack protocol.
## Requirements
### Requirement: Operation model
The system SHALL represent every document mutation as an `Operation` (Insert/Delete/Modify/Neutral) supporting `inverse()`, `transform()` against another operation, `serialize()`, and `getEffectiveRange()`.

#### Scenario: Inverting an operation
- **GIVEN** an `Insert` or `Delete` `Operation`
- **WHEN** `inverse()` is called
- **THEN** it returns the complementary operation (e.g. a `Delete` for an `Insert`) that undoes the original's effect

Implemented in `src/Operation.ts`, validated by `src/Operation.spec.ts`.

### Requirement: Operation transformation rules
The system SHALL implement OT transform rules for colliding block/text/data index operations (insert vs. insert, insert vs. delete, modify vs. modify, etc.), revision-aware for data operations, via `OperationsTransformer`.

#### Scenario: Transforming two colliding operations
- **GIVEN** two operations that touch overlapping or adjacent indexes
- **WHEN** `OperationsTransformer` transforms one against the other
- **THEN** it returns an adjusted operation whose index/range accounts for the other operation's effect, per the OT rule for that combination of operation types

Implemented in `src/OperationsTransformer.ts`, validated by `src/OperationsTransformer.spec.ts`.

### Requirement: Batching rapid local edits
The system SHALL group consecutive character-level text operations from the same user into a single `BatchedOperation` for undo/redo purposes, using a debounce window before committing the batch.

#### Scenario: Debounced batching
- **GIVEN** a user types several characters in quick succession
- **WHEN** less than 500ms elapses between keystrokes
- **THEN** no `put` call is made to the undo/redo manager until 500ms of inactivity elapses, after which a single `BatchedOperation` covering all the characters is committed

#### Scenario: Undoing a batch
- **GIVEN** a committed `BatchedOperation` covering several consecutive inserts
- **WHEN** `undo()` is called
- **THEN** the entire batch is reverted at once, not character by character

Implemented in `src/BatchedOperation.ts`, `src/CollaborationManager.ts`, validated by `src/BatchedOperation.spec.ts`, `src/CollaborationManager.spec.ts`.

### Requirement: Remote operations transform the in-progress local batch
The system SHALL transform an open (not-yet-committed) local batch against any remote operation that arrives while it is open, rather than ignoring the remote change until the batch closes.

#### Scenario: Remote insert merges into an open local batch
- **GIVEN** a local insert of "test" at index [0,4] is still open (not yet debounced/committed)
- **WHEN** a remote insert of "hello" at index [0,5] arrives
- **THEN** the local batch is transformed so the resulting text is "hellotest"

#### Scenario: Conflicting remote delete clears the local batch
- **GIVEN** an open local batch
- **WHEN** a remote delete operation overlaps the batch's effective range such that it cannot be transformed
- **THEN** the batch is reduced to Neutral and discarded, leaving nothing for undo to revert

### Requirement: Undo/redo stack rebasing against remote edits
The system SHALL maintain local undo/redo stacks (`UndoRedoManager`) and rebase (`transformStacks()`) them against incoming remote operations, dropping stack entries that become Neutral as a result.

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

Implemented in `src/UndoRedoManager.ts`, validated by `src/UndoRedoManager.spec.ts`.

### Requirement: OT WebSocket client
The system SHALL provide `OTClient`, which performs a handshake with the OT server, serializes outgoing operations behind an acknowledgement gate, and transforms incoming remote operations against any still-pending local operations before delivering them.

#### Scenario: Serialized send with ack-gating
- **GIVEN** a local operation has been sent and is awaiting server acknowledgement
- **WHEN** a second operation is queued via `send()`
- **THEN** it remains queued and is not transmitted until the first operation's acknowledgement arrives, at which point the revision counter increments and the next queued operation is sent

#### Scenario: Filtering and transforming incoming remote operations
- **GIVEN** a remote operation message arrives while local operations are pending/unacknowledged
- **WHEN** the message is processed
- **THEN** it is transformed against the pending local operations before being surfaced via `onRemoteOperation`; if the transform reduces it to Neutral, the callback is not invoked; messages originating from the client's own `userId`, or of a non-`Operation` message type, are ignored outright

#### Scenario: Cleanup
- **GIVEN** an active `CollaborationManager` with a connected `OTClient`
- **WHEN** `destroy()` is called
- **THEN** the WebSocket connection is closed and all model/event-bus listeners are unsubscribed

Implemented in `src/client/OTClient.ts`, `src/client/Message.ts`, `src/client/MessageType.ts`, validated by `src/client/OTClient.spec.ts`.

**Known limitation**: reconnect/retry on WebSocket disconnect is not implemented (`src/client/OTClient.ts` carries `@todo` markers for offline handling and retries); no test exercises reconnect behavior.

### Requirement: Range intersection classification
The system SHALL classify how two text ranges relate (None/Left/Right/Includes/IncludedBy) to support transform and batch-overlap logic.

#### Scenario: Classifying two ranges
- **GIVEN** two text ranges
- **WHEN** `getRangesIntersectionType` is called with them
- **THEN** it returns one of `None`, `Left`, `Right`, `Includes`, or `IncludedBy` describing how the ranges overlap

Implemented in `src/utils/getRangesIntersectionType.ts`.

### Requirement: Plugin data operations
`CollaborationManager` SHALL translate a `PluginDataModifiedEvent` into a `Modify` `Operation` on its `PluginDataIndex`, with `payload` set to the new value and `prevPayload` to the previous value. `OperationsTransformer` SHALL shift a plugin data operation's block index against block insertions and removals the same way it does for data index operations, SHALL turn it into a `Neutral` operation when its block is removed, and SHALL resolve two concurrent writes to the same block, plugin and key the same way it resolves two concurrent writes to the same data key: the operation being transformed becomes `Neutral` when the operation it is transformed against is the later of the two, a local operation the server has not acknowledged counting as later than any revision. A local operation SHALL count as unacknowledged for the whole round trip, not merely until it leaves for the server, so the client SHALL keep it among the operations an incoming one is transformed against until its acknowledgement arrives. The acknowledgement is what establishes the server's order: while it is outstanding, every remote operation the server delivers was ordered before the local one, and once it arrives, everything after it was ordered later. Writes to different blocks, different plugins or different keys SHALL be left untransformed, since one cannot shift another's position. An operation carrying no revision of its own SHALL lose to whatever it is transformed against. Such an operation comes from an undo or redo stack, whose entries are built from model events and are never numbered, while an operation from the server always is; and the operation it is transformed against has already been applied to the document. Keeping it would leave an undo step that writes a value the document has moved on from, and whose recorded previous value is older still, so undoing a local write that a collaborator had overwritten would delete the collaborator's value. Transformation SHALL also accept a plugin data operation as the operation being transformed *against*, rather than rejecting its index kind. The `Modify` operation payload type SHALL admit any JSON value, including primitives.

#### Scenario: Local plugin data change becomes an operation
- **GIVEN** the local user changes `anchors.visible` on block 1 from `true` to `false`
- **WHEN** `CollaborationManager` handles the resulting event
- **THEN** it sends a `Modify` operation on `Index.pluginData(1, 'anchors', 'visible')` with `payload` `false` and `prevPayload` `true`, rather than logging an unknown event

#### Scenario: Inverting a plugin data operation
- **GIVEN** a plugin data `Modify` operation with `payload` `false` and `prevPayload` `true`
- **WHEN** `inverse()` is called
- **THEN** it returns a `Modify` operation on the same index with `payload` `true` and `prevPayload` `false`

#### Scenario: Transforming against a block insertion
- **GIVEN** a plugin data operation on block 2 and a concurrent block insertion at index 0
- **WHEN** the plugin data operation is transformed against the insertion
- **THEN** its index targets block 3

#### Scenario: A plugin data operation as the against-operation
- **GIVEN** any pending or stacked operation and a plugin data `Modify` operation to transform it against
- **WHEN** the transformation runs — as it does for pending operations on the client, for the undo/redo stacks on every remote plugin data event, and for conflicting operations on the server
- **THEN** it completes and returns an operation, rather than throwing an unsupported-index error

#### Scenario: A scalar payload
- **GIVEN** a plugin data change whose value is a boolean
- **WHEN** the operation is constructed
- **THEN** the payload type admits it, so scalar plugin data is representable in an operation

#### Scenario: Transforming against removal of its block
- **GIVEN** a plugin data operation on block 2 and a concurrent removal of block 2
- **WHEN** the plugin data operation is transformed against the removal
- **THEN** it becomes a `Neutral` operation

#### Scenario: Two clients write the same key concurrently
- **GIVEN** clients A and B both write `anchors.visible` on block 1, and the server applies A before B
- **WHEN** B receives A's operation while its own write is still unacknowledged
- **THEN** A's operation is transformed to `Neutral` on B, so B keeps the value the server will end up holding rather than being left on A's

#### Scenario: A collaborator writes while the local write is in flight
- **GIVEN** the local client has sent a write of `anchors.color` and is waiting for its acknowledgement
- **WHEN** a collaborator's write to the same key arrives before that acknowledgement
- **THEN** it is transformed to `Neutral` and not applied, since the server will apply the local write after it -- and a client's own operations are not echoed back to it, so nothing would restore the value the server ends up holding

#### Scenario: A collaborator writes once the local write is acknowledged
- **GIVEN** the local client's write of `anchors.color` has been acknowledged
- **WHEN** a collaborator's write to the same key arrives
- **THEN** it is applied, because the server ordered it after the local write

#### Scenario: Undoing a write a collaborator overwrote
- **GIVEN** the local user wrote `anchors.color` on block 0, and a collaborator then overwrote the same key
- **WHEN** the undo stack is transformed against the collaborator's operation
- **THEN** the entry is dropped, so undo reaches past it rather than writing a value that is gone and deleting the collaborator's

#### Scenario: Undoing a write to a key nobody else touched
- **GIVEN** the local user wrote `anchors.color` and a collaborator wrote `anchors.label` on the same block
- **WHEN** the undo stack is transformed against the collaborator's operation
- **THEN** the entry survives, because the two do not describe the same value

#### Scenario: Concurrent writes to different keys
- **GIVEN** a plugin data operation on `anchors.visible` and a concurrent one on `anchors.id` of the same block
- **WHEN** one is transformed against the other
- **THEN** it is returned unchanged, because the two do not describe the same value

