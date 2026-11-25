## Context

The v3 List tool keeps its items in one flat array inside a single block:

```ts
{ style, start?, counterType?, items: [{ content: Text, depth: number, checked?: boolean }] }
```

Every List interaction becomes one of three model calls on that array: `createDataNode('items.N', …)`, `removeDataNode('items.N')`, or `updateValue('items.N.depth' | 'items.N.checked', …)`. The model already supports them. `BlockNode.createDataNode` splices when the parent is an array, `removeDataNode` splices it out, and `ValueNode.update` emits `ValueModifiedEvent` with `{ value, previous }`. What is missing is everything downstream of the event: attribution, operations, transforms and replay.

Two undo managers consume model events. `core`'s `UndoRedoManager` records raw event payloads and replays their inverse through `EditorJSModel.insertData` / `removeData` / `modifyData`. `collaboration-manager`'s records `Operation`s and cancels core's with `preventDefault()`. Both replay through the same three model methods, and so does `ot-server`'s `DocumentManager`. Fixing those methods once fixes undo in all three places.

## Goals / Non-Goals

**Goals**
- Data-node insert/delete and value modify on any block reach peers, are applied by `ot-server`, and can be undone and redone locally.
- Concurrent structural edits in the same array converge, including text edits inside a shifted element.

**Non-Goals**
- Re-keying model listeners or `InputsRegistry` after an array splice (a separate change, see proposal).
- Grouping several operations into one undo step in collaboration mode.
- Fixing the client/server protocol (revision stamping, in-flight rebasing, explicit transform order). That is `fix-ot-client-convergence`, which this change depends on.

## Decisions

### D1. Initialization events are marked, not removed

`BlockNode#initialize` calls `createDataNode` once per top-level key. The resulting `DataNodeAddedEvent`s are the only signal `BlockToolAdapter` gets to dispatch `KeyAddedEvent`, which tools such as Paragraph use to create their inputs data-first. They must keep flowing. But they duplicate the `BlockAddedEvent` that precedes them. Turning them into operations would make every block insert also send N data-node inserts, and redo would throw `AlreadyExistingKeyError`.

`DataNodeAddedEvent` therefore gets a boolean marker, `detail.isInitialization`. `BlockNode` sets it for events dispatched from `#initialize`. `CollaborationManager` and core's `UndoRedoManager` skip marked events entirely: no operation, no undo entry and no transform of the undo stacks. `BlockToolAdapter` does not look at the marker.

The marker is lost today when the event bubbles, because `EditorDocument#listenAndBubbleBlockEvent` and `EditorJSModel#listenAndBubbleDocumentEvents` re-create events as `new ctor(index, data, userId)`. Both re-creation sites forward it.

*Alternatives*: a separate `DataNodeInitializedEvent` class would make every adapter-side consumer map two classes to `KeyAdded`. Keeping the no-`userId` quirk would leave it impossible to tell an initialization event from a genuine one, and D2 removes the quirk anyway.

### D2. Explicit `createDataNode` dispatches synchronously

The microtask in `createDataNode` exists only to order initialization events after `BlockAddedEvent`. It is kept for `#initialize` only. A call on an already constructed block dispatches synchronously, so `EditorJSModel` reads the `userId` from the live `WithContext` frame, as it does for every other event.

### D3. Operation shapes

| Model event | Operation | `index` | `data` |
|---|---|---|---|
| `DataNodeAddedEvent` (not initialization) | `Insert` | `DataIndex` | `{ payload: [subtree] }` |
| `DataNodeRemovedEvent` | `Delete` | `DataIndex` | `{ payload: [subtree] }` |
| `ValueModifiedEvent` | `Modify` | `DataIndex` | `{ payload: value, prevPayload: previous }` |

`subtree` is the event's `BlockNodeDataSerializedValue`. Wrapping it in a one-element array keeps `InsertOrDeleteOperationData.payload` `ArrayLike`, matching block operations (`[BlockNodeSerialized]`). It also means the text transformer's `payload.length` reads never see an arbitrary object. `ModifyOperationData.payload` / `prevPayload` widen from `Record<any, any>` to any JSON value (`depth: 2`, `checked: false`), the same widening #192 makes for plugin data.

The model's `insertData` / `removeData` take the raw subtree for a `DataIndex`. A single exported helper, `toModelData(operation)`, unwraps `[subtree]` for a `DataIndex` Insert/Delete and returns `payload` unchanged otherwise. `CollaborationManager.applyOperation` and `ot-server`'s `DocumentManager#applyOperationToModel` both call it, so there is one source of truth for the shape.

`BatchedOperation.canAdd` already returns `false` for non-text indexes, so each data operation is its own undo step.

### D4. Model replay semantics for `DataIndex`

- `modifyData(DataIndex, { value })` calls `updateValue(blockIndex, dataKey, value)`. It creates the node if it is absent, as `updateValue` already does.
- `insertData(DataIndex, subtree)`:
  - when the parent is an array, it splices, as `createDataNode` does now;
  - when the key does not exist, it creates the node;
  - when the key already exists outside an array, it removes the existing node and then creates the new one. This emits `DataNodeRemoved` and then `DataNodeAdded`.
  
  The direct `createDataNode` API keeps throwing `AlreadyExistingKeyError`. Only the replay path replaces.
- `removeData(DataIndex)` is unchanged (`removeDataNode`).

Replacing on insert is what lets two concurrent creations of the same object key converge (D6). Without it, `ot-server` throws on the second one.

### D5. Array positions in the transformer

The transformer has no model, so it reads array positions from the key: **a path segment that is a non-negative integer addresses an array element.** This matches `keypath.insert` / `remove` and `renumberKeys`, which already treat numeric segments as array indices. Object keys made only of digits are not supported for array semantics. A tool must not use them, and the spec says so.

For an operation `against` at `P.i` (prefix `P`, last segment the integer `i`) and an operation `op` whose key (`DataIndex.dataKey` or `TextIndex.dataKey`) is `P.j` or `P.j.rest`, in the same block:

| `against` | `op` relation | Result |
|---|---|---|
| Insert at `P.i` | `j > i` | `j → j+1` |
| Insert at `P.i` | `j == i`, `op` key is deeper (`P.i.rest`) | `j → j+1` (the element moved) |
| Insert at `P.i` | `j == i`, `op` is an Insert at exactly `P.i` | tie-break (below) |
| Insert at `P.i` | `j == i`, `op` is a Delete at exactly `P.i` | `j → j+1` |
| Delete at `P.i` | `j > i` | `j → j−1` |
| Delete at `P.i` | `j == i`, `op` is an Insert at exactly `P.i` | unchanged |
| Delete at `P.i` | `j == i`, anything else (same element or inside it) | `Neutral` |
| any | `j < i`, or `op` key outside `P` | unchanged |

For an operation `against` that deletes a key `K` whose last segment is **not** an integer (an object member), any `op` at `K` or under `K.` becomes `Neutral`, except a write (an Insert or a `Modify`, see D6) at exactly `K`, which re-creates it and is unchanged.

Prefixes nest: `P` itself may contain array segments (`rows.2.cells.0`). Only the segment at depth `|P|` is compared and rewritten. A text operation keeps its `textRange` and only its `dataKey` is rewritten (a `TextIndex` with the new key).

**Tie-break for two Inserts at the same array position.** This uses the explicit order argument from `fix-ot-client-convergence`, `op.transform(against, againstIsLater)`. `op` shifts to `i+1` iff `against` comes earlier (`againstIsLater` is false). Revisions are not consulted: remote operations reach the undo stacks rebuilt from model events, without one. All three paths give the same order:

- *Server.* Incoming `A` is reduced through history op `B` (default order), so `A` shifts. `B` stays at `i` and `A` goes to `i+1`.
- *Author of `A`.* `OTClient` transforms incoming `B` against its unacknowledged `A` with `againstIsLater: true`, so `B` stays at `i`. The local `A` moves to `i+1` because the model splices, and the client rebases `A` against `B` with the default order. The result is the same order.
- *Undo stacks.* An entry rebased against a remote insert at the same position (default order) shifts, which is correct: the remote element now sits in front of it. D8 covers how the stacks are rebased.

### D6. Conflicting writes on the same or overlapping keys

A *write* here is a `Modify`, or an `Insert` at a key whose last segment is not an integer, which replaces whatever is at that key (D4). An Insert at an array position doesn't replace anything and follows D5. Two keys *overlap* when one equals the other or is a prefix of it by whole segments (`meta` and `meta.url`, but not `meta` and `metadata`). D5 shifting is applied first, and overlap is checked on the shifted keys.

Overlapping operations are resolved by depth, and every rule gives the same result whichever operation is transformed against the other:

- **The shallower key wins.** A write or a Delete at a key replaces or removes the whole subtree, so it wins over any operation under that key, regardless of order. An `op` under the key (`Insert`, `Delete`, `Modify` or a text operation) becomes `Neutral` when transformed against it. The operation at the shallower key, transformed against one under its key, is returned unchanged. The Delete half is D5's object-member rule; the write half is new.
- **At the same key, a write wins over anything that isn't a write.** A Delete or a text operation at exactly the key of a write becomes `Neutral` when transformed against the write, in either order, and the write transformed against it is returned unchanged. For a Delete, this is the other direction of D5's exception, where a write at the deleted key is kept. Without it, the deleting client keeps the node the server removed, or the writing client loses the node the server kept.
- **Two writes at the same key.** Last-writer-wins in server order: `op` becomes `Neutral` iff `against` comes later (`againstIsLater`). Otherwise `op` is kept and applied after `against`. This is the rule `fix-ot-client-convergence` sets for values. With replace-on-insert (D4), it also covers two Inserts creating the same object key.
- **Two Deletes at the same key.** The one transformed becomes `Neutral`, as in D5.
- **Array positions.** When the key's last segment is an integer, the same-key rules above don't apply and D5 decides: a Delete at `P.i` wins over a `Modify` at exactly `P.i` in both directions, and an array Insert shifts the operations at and after its position.

For example, X inserts `meta = {url: 'a'}` while Y deletes `meta`. In either server order, everyone ends with `{url: 'a'}`.

- *Server takes X first.* Y is transformed against X and becomes `Neutral`; client X ignores the broadcast. Client Y transforms incoming X against its unacknowledged Y, and X stays unchanged, re-creating `meta`.
- *Server takes Y first.* X is transformed against Y and stays unchanged. Client Y applies X after its acknowledgement. Client X transforms incoming Y against its unacknowledged X, and Y becomes `Neutral`.

The same walk-through holds for X inserting `meta` while Y inserts `meta.url = 'b'`, with Y's write under the key instead of a Delete at it.

For example, X inserts `meta = {url: 'a'}` and Y concurrently inserts `meta.url = 'b'`. In either server order, everyone ends with `{url: 'a'}`.

- *Server takes X first.* Y is transformed against X, becomes `Neutral`, and is stored and broadcast as one. Client X ignores it. Client Y transforms incoming X against its unacknowledged Y, and X stays unchanged, replacing `meta`.
- *Server takes Y first.* X is transformed against Y and stays unchanged. Client Y applies X after its acknowledgement. Client X transforms incoming Y against its unacknowledged X, and Y becomes `Neutral`.

*Alternative*: last-writer-wins across levels, where an earlier ancestor write is kept and a later descendant write is applied inside it. That gives the descendant write a chance to win, but the client that sent the descendant write must then patch the incoming ancestor payload with its own write. For a text operation under the key, that means applying a text operation to a serialized subtree, which the transformer can't do without a model. The rules above need no payload rewriting and match how D5 treats deleted members.

Every new rule is added to the existing `#transformAgainstDataOperation` branch, which `#applyTransformation` already dispatches to for any `DataIndex` `againstOp`. Text operations stop being returned unchanged there. Data operations transformed against *text* operations, and anything transformed against *block* operations, keep their current rules: `DataIndex` already has `withBlockIndex`.

### D7. Undo/redo

`Operation.inverse()` already swaps Insert ↔ Delete with the same payload and swaps `payload` / `prevPayload` for Modify. With D3 and D4 in place, collaboration undo of a data operation works without new code. Core's `UndoRedoManager` replays `event.data` for Added/Removed (the raw subtree, which matches the model) and inverts Modified, so it works once D1 (skip the marker), D2 (attribution) and D4 (`modifyData`) are in place.

Collaboration undo also depends on the stacks being rebased correctly against remote operations, which D8 fixes.

### D8. Undo stacks are rebased in each entry's own document

`UndoRedoManager.transformStack` transforms every stack entry against the same remote operation. The remote operation is expressed in the current document, but only the newest entry was recorded there. Each older entry was recorded before the entries above it were applied, so the remote operation's position is wrong for it. With two local inserts at `items.0` and then a remote insert at `items.1`, both entries stay at `items.0`, and the second undo deletes the remote element instead of the first local one.

This already happens with text, independently of this change. Type `a` into an empty paragraph, then type `b` at 0 as a separate undo step (`ba`). A remote user inserts `R` at 1 (`bRa`). The first undo deletes `b`. The second undo deletes position 0, which is now `R`, and leaves `a`. This change makes the same flaw reachable through array edits, so it fixes it here.

`transformStacks` rebases each stack from the newest entry to the oldest, carrying the remote operation `r` back through the history:

1. Take the entry's inverse `u`. It applies to the same document as `r`.
2. Transform `u` against `r` with the default order (`r` counts as earlier), and store the inverse of the result as the new entry. An entry that becomes `Neutral` is dropped, as now.
3. Transform `r` against `u` with `againstIsLater: true`. That expresses `r` in the document as it was before the entry, for the next older one. The flags in steps 2 and 3 are opposite, so a position tie resolves the same way in both.
4. If `r` becomes `Neutral`, it was entirely inside what the entry added. The older entries don't depend on it and are left unchanged.

A batch entry is rebased the same way, operation by operation, through its inverse operations in the order they apply. Today's batches (contiguous typing or deleting) give the same result as before, but the fold keeps them correct for any sequence. The redo stack is rebased with the same procedure, starting from the original `r`, because its newest entry was also recorded in the current document.

*Alternative*: a separate bug change on `main`. The fix needs the transform order argument from `fix-ot-client-convergence` for step 3, and this change is where it becomes reachable for structural edits, so it lives here.

## Risks / Trade-offs

- **Stale delete payloads.** A Delete carries a snapshot of the removed subtree. If a peer edits inside the element concurrently, the server still deletes the right element, but undoing the delete restores the snapshot without the peer's edit. Block deletes behave the same way today. This is accepted and documented.
- **Undoing a Modify overwrites a newer remote value.** Undo stack entries are rebased with the default order (D8), so a remote Modify on the same key does not neutralize them. Undo then restores the local `prevPayload` over the peer's value. This is current behavior for data operations and is unchanged.
- **A replaced value discards concurrent edits at or inside it.** Under D6, a write at `meta` wins over a concurrent write at `meta.url` even if the server orders the `meta.url` write later. It also wins over a concurrent Delete of `meta`, and a write at `caption` discards text typed into `caption` at the same time. This matches how deleting a member discards concurrent edits inside it.
- **Dependency on `fix-ot-client-convergence`.** Until it lands, the server never transforms client operations and the client skips its in-flight operation, so concurrent array edits diverge exactly as concurrent text edits do today. The rules here are correct only on top of that fix.
- **The numeric-segment convention** rules out digit-only object keys for array semantics. It is cheap to state, and no current tool uses such keys.
- **Wire compatibility.** An older `ot-server` silently ignores `DataIndex` Insert/Delete (no model support) and drops `Modify`. Clients and server deploy together, which is already the rule for this monorepo.

## Migration Plan

No data migration. Ship `model-types`, `model`, `collaboration-manager`, `core` and `ot-server` together.

## Open Questions

None blocking. The array re-keying change must land before the List tool enables structural editing in collaboration mode.
