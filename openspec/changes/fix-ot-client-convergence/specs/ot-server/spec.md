## MODIFIED Requirements

### Requirement: Operation transformation against history
The system SHALL apply incoming operations to the per-document `EditorJSModel` via `DocumentManager`, serializing concurrent `process()` calls through an internal promise chain, and transforming any operation whose revision is behind the current history against all operations submitted since that revision. A `Neutral` operation SHALL be stored and SHALL advance the revision without changing the model.

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

#### Scenario: Neutral operation is a no-op that still advances the revision
- **GIVEN** an operation that is `Neutral` on arrival, or that transforming against history reduces to `Neutral` (for example a deletion inside a range another client already deleted)
- **WHEN** it is processed
- **THEN** the model is left unchanged, the operation is stored in the history, the revision advances, and `process()` resolves with it, so `OTServer` broadcasts it, acknowledging it to the sender

#### Scenario: Operations after a Neutral one keep being processed
- **GIVEN** a document whose history contains a `Neutral` operation
- **WHEN** a later operation is processed
- **THEN** it is transformed and applied normally

Implemented in `src/DocumentManager.ts`, validated by `src/DocumentManager.spec.ts`.
