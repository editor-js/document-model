## MODIFIED Requirements

### Requirement: OT WebSocket client
The system SHALL provide `OTClient`, which performs a handshake with the OT server, serializes outgoing operations behind an acknowledgement gate, stamps each outgoing operation with the number of server operations the client has applied, and transforms incoming remote operations against the in-flight operation and every queued local operation, rebasing those local operations against the incoming one, before delivering it.

#### Scenario: Serialized send with ack-gating
- **GIVEN** a local operation has been sent and is awaiting server acknowledgement
- **WHEN** a second operation is queued via `send()`
- **THEN** it remains queued and is not transmitted until the first operation's acknowledgement arrives, at which point the revision counter increments and the next queued operation is sent

#### Scenario: Stamping the base revision
- **GIVEN** the client has applied `n` server operations, counting the handshake revision, acknowledgements and remote operations
- **WHEN** it transmits a local operation
- **THEN** the message carries `rev: n`, so the server transforms it against exactly the operations the client has not seen

#### Scenario: Filtering and transforming incoming remote operations
- **GIVEN** a remote operation message arrives while a local operation is in flight and others are queued
- **WHEN** the message is processed
- **THEN** it is transformed against the in-flight operation and then each queued operation, those local operations are rebased against it, and it is surfaced via `onRemoteOperation`; if the transform reduces it to Neutral, the callback is not invoked; messages originating from the client's own `userId`, or of a non-`Operation` message type, are ignored outright

#### Scenario: Neutral remote operation still advances the revision
- **GIVEN** the server broadcasts a `Neutral` operation, or a remote operation is reduced to `Neutral` by the client's transform
- **WHEN** the message is processed
- **THEN** the client's revision counter advances as for any remote operation, and `onRemoteOperation` is not invoked

#### Scenario: Dropping a queued operation neutralized by rebasing
- **GIVEN** a queued local operation that becomes `Neutral` when rebased against an incoming remote operation
- **WHEN** it reaches the front of the queue
- **THEN** it is dropped instead of being sent, and the next queued operation is considered

#### Scenario: Concurrent clients converge
- **GIVEN** two clients insert text concurrently, at different positions or at the same position, including while one has an operation in flight and another queued
- **WHEN** the server has processed all operations and both clients have received them
- **THEN** both clients and the server hold the same text

#### Scenario: Cleanup
- **GIVEN** an active `CollaborationManager` with a connected `OTClient`
- **WHEN** `destroy()` is called
- **THEN** the WebSocket connection is closed and all model/event-bus listeners are unsubscribed

Implemented in `src/client/OTClient.ts`, `src/client/Message.ts`, `src/client/MessageType.ts`, validated by `src/client/OTClient.spec.ts` and `packages/ot-server/src/convergence.spec.ts`.

**Known limitation**: reconnect/retry on WebSocket disconnect is not implemented (`src/client/OTClient.ts` carries `@todo` markers for offline handling and retries); no test exercises reconnect behavior.

## ADDED Requirements

### Requirement: Explicit transform order
The system SHALL let the caller of `Operation.transform(against, againstIsLater)` state whether `against` is ordered before (default) or after the transformed operation, and SHALL NOT infer that order from revisions. When `against` comes earlier, an Insert at the same text position shifts after it and a value Modify on the same key is kept. When `against` comes later, the Insert keeps its position and the Modify becomes `Neutral`.

#### Scenario: Server rebases an incoming insert at the same position
- **GIVEN** an Insert at position 0 and a history Insert at position 0
- **WHEN** the incoming operation is transformed against the history operation with the default order
- **THEN** it is shifted past the inserted text

#### Scenario: Client keeps a remote insert at the same position
- **GIVEN** a remote Insert at position 0 and an unacknowledged local Insert at position 0
- **WHEN** the remote operation is transformed against the local one with `againstIsLater: true`
- **THEN** its position is unchanged

### Requirement: Insert against insert transforms by position
The system SHALL transform a text Insert against a concurrent text Insert in the same input by comparing their start positions only, and SHALL NOT merge the other Insert's payload into the transformed one. If the other Insert starts earlier, the transformed Insert shifts right by the other payload's length; if it starts later, the transformed Insert is unchanged; if both start at the same position, the order given by `againstIsLater` decides.

#### Scenario: Concurrent insert inside a multi-character insert's range
- **GIVEN** the text `hello`, an Insert of `abc` at position 2 and a concurrent Insert of `Z` at position 3, both based on the same revision
- **WHEN** the `abc` Insert is transformed against the `Z` Insert
- **THEN** it still inserts `abc` at position 2, and applying both yields `heabclZlo`

#### Scenario: Concurrent insert before the transformed insert
- **GIVEN** an Insert of `abc` at position 3 and a concurrent Insert of `Z` at position 1
- **WHEN** the `abc` Insert is transformed against the `Z` Insert
- **THEN** it inserts `abc` at position 4 with its payload unchanged
