# Collaboration & Undo/Redo

## Architecture

`CollaborationManager` bridges `EditorJSModel` and `OTClient` (WebSocket client):

1. Converts local model changes into `Operation` and sends them.
2. Applies incoming remote operations back to the model.
3. Batches rapid operations and forwards completed batches to `UndoRedoManager`.

## Operational transformation

When concurrent edits start from revision `N`, reconciliation is two-step:

- **Step 1**: transform each pending local op against the incoming remote op.
- **Step 2**: transform the remote op against pending local ops before applying locally.

This preserves convergence regardless of arrival order.


→ [`diagrams/collaboration-ot-flow.mmd`](diagrams/collaboration-ot-flow.mmd)

_Handshake, local send/ack path, remote OT transform path, then local apply._

## Wire protocol

`OTClient` and `OTServer` exchange JSON messages over WebSocket. Every message has the shape:

```json
{ "type": "<MessageType>", "payload": { ... } }
```

### Message types

| `type` | Direction | Payload fields | Description |
|---|---|---|---|
| `Handshake` | Client → Server | `document` (DocumentId), `userId`, `rev`, `data?` (EditorDocumentSerialized) | Connect to a document. Client sends its current state on first connect. |
| `Handshake` | Server → Client | `document`, `userId`, `rev`, `data?` | Server echoes back. If the server already has the document, `data` contains the authoritative state and the client should call `initializeDocument(data)`. |
| `Operation` | Client → Server | Serialized `Operation` (`type`, `index`, `data`, `userId`, `rev`) | A local operation to apply. |
| `Operation` | Server → All clients | Serialized transformed `Operation` | Server broadcasts the transformed operation to every client in the document room (including the author — the author's copy serves as an ack). |

### Server-side OT

`OTServer` maintains one `DocumentManager` per `documentId`. On receiving an `Operation`:
1. If `operation.rev` is ahead of the server's current revision the operation is rejected (WebSocket closed with code `4400`).
2. Conflicting operations (all ops with `rev >= operation.rev`) are fetched and the incoming op is transform-reduced through them.
3. The transformed op is applied to the server's `EditorJSModel` copy and the revision counter is incremented.
4. The transformed op (with the new `rev`) is broadcast to all clients in the document room.

Operations are processed sequentially per document — `DocumentManager` queues them so a new op always awaits the previous one.

## Undo / Redo

`BatchedOperation` groups rapid edits with debounce and terminates on timeout or incompatible operation type.

`UndoRedoManager` stores completed batches. Undo/redo invert and apply operations while event re-recording is disabled (`shouldHandleEvents = false`) to avoid stack pollution.


→ [`diagrams/undo-redo-flow.mmd`](diagrams/undo-redo-flow.mmd)

_Rapid edits are merged into one logical batch; undo/redo replay inverses of that effective operation._
