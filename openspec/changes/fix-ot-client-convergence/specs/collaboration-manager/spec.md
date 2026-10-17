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
