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
