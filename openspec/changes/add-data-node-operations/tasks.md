## 0. Prerequisite

- [ ] 0.1 Confirm `fix-ot-client-convergence` has landed (explicit transform order, revision stamping, in-flight rebasing)

## 1. Event attribution and initialization marker

- [ ] 1.1 Write failing specs in `packages/model-types` for `DataNodeAddedEvent.detail.isInitialization`: it is `true` when passed and defaults to `false`
- [ ] 1.2 Add the `isInitialization` constructor parameter and detail field to `DataNodeAddedEvent`
- [ ] 1.3 Write failing `BlockNode` specs: `createDataNode` on a constructed block dispatches synchronously and unmarked; nodes created in `#initialize` dispatch after construction, marked
- [ ] 1.4 Split `BlockNode.createDataNode` so that only `#initialize` keeps the microtask and sets the marker
- [ ] 1.5 Write failing `EditorDocument` / `EditorJSModel` specs: a re-dispatched `DataNodeAddedEvent` keeps the marker, and an explicit `createDataNode('user-1', …)` arrives with `userId: 'user-1'`
- [ ] 1.6 Forward the marker in `EditorDocument#listenAndBubbleBlockEvent` and `EditorJSModel#listenAndBubbleDocumentEvents`

## 2. Model replay by DataIndex

- [ ] 2.1 Write failing `EditorDocument` specs for `modifyData` on a `DataIndex` (set value, emits `ValueModifiedEvent`)
- [ ] 2.2 Implement the `DataIndex` branch of `modifyData` via `updateValue`
- [ ] 2.3 Write failing specs for `insertData` on a `DataIndex`: array splice, absent key, existing object key replaced (Removed then Added event, no throw); `createDataNode` still throws for an existing key
- [ ] 2.4 Implement replace-on-insert in the `DataIndex` branch of `insertData`

## 3. Operations

- [ ] 3.1 Widen `ModifyOperationData` payload/prevPayload to any JSON value and narrow the text transformer's `payload.length` reads to `InsertOrDeleteOperationData` (skip if #192 has landed)
- [ ] 3.2 Write failing specs for `toModelData(operation)`: unwraps `[subtree]` for a `DataIndex` Insert/Delete, passes other payloads through
- [ ] 3.3 Implement and export `toModelData`; use it in `CollaborationManager.applyOperation`
- [ ] 3.4 Write failing `CollaborationManager` specs: the three events map to Insert/Delete/Modify with the D3 shapes; marked initialization events produce no operation, no undo entry and no stack transform
- [ ] 3.5 Map the three events in `#handleEvent` and skip marked events before the local/remote branch

## 4. Transformer

- [ ] 4.1 Write failing `OperationsTransformer` specs for every row of the D5 table, for both data and text operations, including nested prefixes (`rows.2.cells.0`) and other blocks or arrays left unchanged
- [ ] 4.2 Write failing specs for the same-position Insert tie-break with the default order (shifts) and with `againstIsLater: true` (keeps position)
- [ ] 4.3 Write failing specs for object-member Delete (`Neutral` at or under the key, re-create left unchanged) and for Insert vs. Insert on the same object key by transform order
- [ ] 4.4 Implement a key-relation helper (common prefix, array position at that depth) and extend `#transformAgainstDataOperation` to handle Insert/Delete against operations, re-keying `DataIndex` and `TextIndex` via a new data-key copy method
- [ ] 4.5 Add a two-client convergence spec driving `DocumentManager` and `OTClient`-style pending transforms for concurrent same-position inserts and an insert vs. a text edit in a later element

## 5. Undo/redo

- [ ] 5.1 Write failing collaboration `UndoRedoManager` / `CollaborationManager` specs: undo/redo of a data Insert, Delete (subtree with text restored) and Modify; undo stack re-keyed by a remote array insert
- [ ] 5.2 Write failing core `UndoRedoManager` specs: value change undone without collaboration; block insert records `BlockAddedEvent` only
- [ ] 5.3 Skip marked initialization events in core `UndoRedoManager#handleEvent`; update the #201 R2 test to assert on the marker if that PR has landed

## 6. ot-server

- [ ] 6.1 Write a failing `DocumentManager` spec: data Insert and Modify are applied and visible in `currentModelState()`
- [ ] 6.2 Use `toModelData` in `DocumentManager#applyOperationToModel`

## 7. Docs and wrap-up

- [ ] 7.1 Update `docs/collaboration.md` with the data operation kinds and the array transform rules
- [ ] 7.2 Update `docs/events.md` for `isInitialization` and synchronous dispatch
- [ ] 7.3 Run `yarn build`, `yarn lint`, `yarn test`, and mutation tests for `collaboration-manager` and `model`
- [ ] 7.4 Run `openspec validate add-data-node-operations --type change`
