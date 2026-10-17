## Why

Changes to a block's data tree other than text are local-only today. A data node created or removed (`DataNodeAddedEvent` / `DataNodeRemovedEvent`) or a value updated (`ValueModifiedEvent`) is never sent to collaborators and cannot be undone:

- `CollaborationManager#handleEvent` only maps text and block events to `Operation`s. The three data events fall through to `console.error('Unknown event type')`.
- `EditorDocument.modifyData` handles only `TextIndex` (`@todo implement other actions`). So a `Modify` on a `DataIndex` does nothing, whether it comes from undo, a remote peer or `ot-server`. This is true for the core `UndoRedoManager` as well as the collaboration one.
- A locally created data node reports no `userId`. `BlockNode.createDataNode` dispatches `DataNodeAddedEvent` in a microtask, `EditorDocument` drops `detail.userId` when it bubbles the event, and `EditorJSModel` re-reads an execution context that has already been popped. Even if the event were mapped, it would be treated as remote and never sent.
- `OperationsTransformer` handles `DataIndex` with last-writer-wins on the exact same key only. Nothing shifts positions in an array, so concurrent inserts and deletes in the same array (or text edits inside a shifted element, e.g. `items.3.content` after an insert at `items.1`) land on the wrong element.

The v3 List tool depends on all four. It stores items as one flat array, `items: [{ content, depth, checked? }]`. Tab/Shift+Tab is `updateValue('items.N.depth')`, Enter inserts an array element, a Backspace merge removes one, and a checkbox toggle is `updateValue('items.N.checked')`. Each of these must sync to peers and be undoable.

## What Changes

- **Model events carry their author.** `createDataNode` called on an existing block dispatches `DataNodeAddedEvent` synchronously with the context `userId`. `DataNodeAddedEvent`s dispatched while a `BlockNode` is being constructed are marked as initialization events. They still reach adapters, which is how tools render their inputs data-first, but they never become operations or undo steps, because `BlockAddedEvent` already carries the whole block.
- **The model applies data operations by index.** `modifyData` applies a `DataIndex` change through `updateValue`. `insertData` on a `DataIndex` whose key already exists (outside an array) replaces the node instead of throwing, so concurrent creations of the same key converge on last-writer-wins.
- **New operation kinds in `collaboration-manager`.** `DataNodeAdded` becomes an `Insert` and `DataNodeRemoved` a `Delete` on a `DataIndex`, with a one-element `payload: [subtree]`. `ValueModified` becomes a `Modify` with `payload` / `prevPayload`. `ModifyOperationData.payload` widens to any JSON value, the same widening as #192. The client and `ot-server` share one helper that turns an operation into model-shaped data.
- **Transformer rules for array positions.** Inserts and deletes of array elements shift the positions of other operations in the same array: data operations and text operations whose `dataKey` passes through that array. Operations inside a deleted element or a deleted subtree become `Neutral`. Two inserts at the same position break the tie with the explicit transform order from `fix-ot-client-convergence`, so the server and every client order them the same way. Value vs. value on the same key keeps last-writer-wins under that same order.
- **Undo/redo of data changes works** in both the core and collaboration undo managers. No new mechanism is needed: the existing inversion works once the model applies the inverted change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `collaboration-manager`: data-node and value events become operations; new transformation rules for array positions and subtree deletion; undo/redo of data operations.
- `model`: `modifyData` / `insertData` semantics for `DataIndex`; synchronous, attributed `DataNodeAddedEvent` outside construction.
- `model-types`: `DataNodeAddedEvent` gains the initialization marker, and bubbling keeps it.
- `core`: the local `UndoRedoManager` records data-node and value changes and skips initialization events.
- `ot-server`: `DocumentManager` applies data-node and value operations to its model.

## Out of scope / dependencies

- **Array element re-keying in the model and the DOM (separate change, hard prerequisite for List).** `BlockNode` node listeners capture their key at creation (`#listenAndBubbleTextNodeEvent` / `#listenAndBubbleValueNodeEvent`), and `InputsRegistry` in `dom-adapters` is not re-keyed. After an insert at `items.1`, the node now at `items.2` keeps reporting `items.1`, so local edits there produce wrongly addressed operations. This change only makes *operations in flight* account for shifts. The tests here apply operations and never edit a node whose position has moved.
- **Undo grouping in collaboration mode.** Data operations are never batched in `BatchedOperation`, so List Enter (text delete + item insert) is two undo steps when collaboration is enabled. Core's grouping by browser task (#201 / #203) does not cover `CollaborationManager`. #201 already lists this as a follow-up.
- **Interaction with #201 / #203.** #201's design (R2) relies on construction-time `DataNodeAddedEvent`s having no `userId`. This change replaces that accident with an explicit marker. Whichever lands second updates the R2 test to assert on the marker.
- **Depends on `fix-ot-client-convergence`.** That change makes the server actually transform client operations, makes the client transform against its in-flight operation and rebase its queue, and adds `transform(against, againstIsLater)`. The tie-break and same-key rules here are written in terms of that order argument, and convergence for array edits holds only once it has landed.
- **Interaction with #192.** #192 widens `ModifyOperationData` in the same way. Whichever lands second drops its duplicate.

## Impact

- **Code**: `packages/model-types/src/events/DataNodeAddedEvent.ts`; `packages/model/src/entities/BlockNode/index.ts`, `EditorDocument/index.ts`, `EditorJSModel.ts`; `packages/collaboration-manager/src/{CollaborationManager,Operation,OperationsTransformer}.ts`; `packages/core/src/components/UndoRedoManager.ts`; `packages/ot-server/src/DocumentManager.ts`.
- **Wire format**: additive. `Insert` / `Delete` / `Modify` on `k: "data"` indexes, which already serialize. Clients and `ot-server` must deploy together, because an older server drops these operations.
- **Docs**: `docs/collaboration.md` (operation kinds and the transform rules table), `docs/events.md` (`DataNodeAddedEvent` marker and synchronous dispatch). The "Step 1: transform each pending local op against the incoming remote op" in `docs/collaboration.md` does not match `OTClient`, which only transforms the incoming op against pending ones. This change does not alter that and notes it in design.md.
