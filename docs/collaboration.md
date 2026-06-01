# Collaboration & Undo/Redo

## Architecture

`CollaborationManager` is a plugin (`@editorjs/collaboration-manager`) registered in `Core` during setup. It bridges `EditorJSModel` and `OTClient` (WebSocket client):

1. Subscribes to model change events and converts them into `Operation` messages sent over WebSocket.
2. Listens for incoming remote operations and applies them back to the model.
3. Batches rapid operations (500ms debounce window) and forwards completed batches to its own `UndoRedoManager`.
4. On `CoreEventType.Ready`, connects to the OT server if server config is provided.

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

There are two undo/redo systems:

### Single-user undo/redo (`@editorjs/core`)

`UndoRedoManager` in Core listens to document model events directly, groups consecutive changes by a 500ms debounce window, and stores logical steps on stacks.

Undo/redo inverts and re-applies the stored events while suppressing re-record to avoid stack pollution.

This manager respects `UndoCoreEvent` and `RedoCoreEvent` — if either event's `defaultPrevented` is true, the manager skips the operation, allowing other handlers (like `CollaborationManager`) to take precedence.

### Collaborative undo/redo (`@editorjs/collaboration-manager`)

`UndoRedoManager` in Collaboration stores `Operation` instances and inverts them for the OT pipeline.

`BatchedOperation` groups rapid single-character inserts or deletes on the same data key into one logical edit for better history granularity. Insert operations are batched when each character is appended sequentially (`[0,0]`, `[1,1]`, `[2,2]`...). Delete operations are batched in two patterns: **backspace** where position decrements after each deletion (`[3,3]`, `[2,2]`, `[1,1]`...), or **forward delete** where position stays the same (`[0,0]`, `[0,0]`...).

When a user presses Cmd/Ctrl+Z or calls `api.document.undo()`, `DocumentAPI` dispatches a `UndoCoreEvent`. `CollaborationManager` listens first and immediately calls `preventDefault()` to take over undo/redo handling, forwarding the operation through the OT server (if connected). Core's `UndoRedoManager` also listens but only processes undo if not prevented by an earlier handler.

→ [`diagrams/undo-redo-flow.mmd`](diagrams/undo-redo-flow.mmd)

_Rapid edits are merged into one logical batch; undo/redo replay inverses of that effective operation._
