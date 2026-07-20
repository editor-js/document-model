# OT Server

## Purpose

`@editorjs/ot-server` is a standalone Node.js WebSocket server implementing operational transformation for real-time collaborative editing. It accepts client connections keyed by document id, holds authoritative per-document state using `@editorjs/model`'s `EditorJSModel`, transforms and serializes incoming operations from `@editorjs/collaboration-manager`, and broadcasts transformed operations to all other clients editing the same document. It has no persistence layer — all state is in-memory and dropped when the last client for a document disconnects.

## Requirements

### Requirement: WebSocket connection and handshake
The system SHALL listen on `process.env.WSS_PORT` (default `8080`) and, on receiving a `Handshake` message (`{ document, data? }`), create a `DocumentManager` for that document id on first connection (optionally seeding it via `initializeDocument(data)`), register the socket against that document, and reply with `{ type: Handshake, payload: { ...payload, rev, data } }` — including current server `data` only for clients joining after the first.

#### Scenario: First client seeds the document
- **GIVEN** no client has yet connected for a given document id
- **WHEN** the first client sends a `Handshake` with `data`
- **THEN** the server creates a `DocumentManager` seeded from that `data`, and does not echo `data` back in its handshake reply

#### Scenario: Late joiner receives current state
- **GIVEN** a `DocumentManager` already exists for a document id
- **WHEN** a subsequent client sends a `Handshake` for that document
- **THEN** the server replies with the current server-side document state and revision

Implemented in `src/OTServer.ts`.

### Requirement: Operation processing and broadcast
The system SHALL, on receiving an `Operation` message, rehydrate it via `Operation.from(payload)`, resolve the `DocumentManager` for `operation.index.documentId`, call `manager.process(operation)`, and on success broadcast `{ type: Operation, payload: processedOperation.serialize() }` to every client subscribed to that document, including the sender.

#### Scenario: Broadcasting a successfully processed operation
- **GIVEN** a client sends a valid `Operation` for an existing document
- **WHEN** `DocumentManager.process()` resolves successfully
- **THEN** the transformed operation is serialized and sent to all clients of that document, including the originating client

Implemented in `src/OTServer.ts`, `src/DocumentManager.ts`.

### Requirement: Protocol error handling
The system SHALL close the client socket with code `4400` (`BAD_REQUEST_CODE`) and a descriptive reason when a handshake or operation message is missing a `documentId`, references an unknown document, or is rejected by the `DocumentManager`.

#### Scenario: Missing documentId
- **GIVEN** a client sends a `Handshake` or `Operation` message with no `documentId`
- **WHEN** the server processes the message
- **THEN** it closes the socket with code `4400` and a reason describing the missing field

Implemented in `src/OTServer.ts`.

### Requirement: Connection lifecycle and state teardown
The system SHALL remove a disconnecting socket from its document's client set, and when that was the last client for a document, delete both the client set and the `DocumentManager` for that document, discarding all in-memory state.

#### Scenario: Last client disconnects
- **GIVEN** exactly one client remains connected for a document
- **WHEN** that client's socket closes
- **THEN** the server deletes both the client set and the `DocumentManager` for that document, discarding its in-memory state

Implemented in `src/OTServer.ts` (untested — no test exercises the connect/disconnect lifecycle directly).

### Requirement: Operation transformation against history
The system SHALL apply incoming operations to the per-document `EditorJSModel` via `DocumentManager`, serializing concurrent `process()` calls through an internal promise chain, and transforming any operation whose revision is behind the current history against all operations submitted since that revision.

#### Scenario: Sequential same-user operations
- **GIVEN** three consecutive `Insert` operations from the same user with correctly incrementing `rev` values
- **WHEN** each is processed in order
- **THEN** they are applied in order, producing the concatenated result

#### Scenario: Concurrent operations at the same revision
- **GIVEN** two `Insert` operations both submitted at the same revision
- **WHEN** both are processed
- **THEN** they are transformed against each other rather than one being rejected — the second is shifted to insert after the first

#### Scenario: Late-arriving older operation
- **GIVEN** an operation submitted with an older revision arrives after a newer operation has already been processed
- **WHEN** it is processed
- **THEN** it is transformed against all operations in the history with revision greater than or equal to its own, producing a correctly ordered result

#### Scenario: Overlapping process() calls stay ordered
- **GIVEN** multiple `process()` calls are fired without awaiting each other
- **WHEN** they are handled internally
- **THEN** they are serialized via promise chaining (`#operationInProcessing`) so operations still apply in submission order deterministically

#### Scenario: Rejecting an operation ahead of server revision
- **GIVEN** an operation whose `rev` is greater than the server's `#currentRev`
- **WHEN** `#processNextOperation` evaluates it
- **THEN** processing resolves to `null` and the error is logged, which `OTServer` surfaces as closing the socket with code `4400`

#### Scenario: Document initialization
- **GIVEN** a `DocumentManager` created for a new document
- **WHEN** `initializeDocument(data)` is called with the first client's handshake data
- **THEN** the internal `EditorJSModel` is seeded from `data`, and `currentModelState()` returns its serialized form for late-joining clients

Implemented in `src/DocumentManager.ts`, validated by `src/DocumentManager.spec.ts`.

### Requirement: Server bootstrap
The system SHALL load environment configuration via `dotenv`, optionally initialize Hawk error tracking in production, and start `OTServer`.

#### Scenario: Starting in production
- **GIVEN** the process is started with a production environment configuration
- **WHEN** `src/index.ts` runs
- **THEN** environment variables are loaded via `dotenv`, Hawk error tracking is initialized, and `OTServer` is started listening on `WSS_PORT`

Implemented in `src/index.ts`.
