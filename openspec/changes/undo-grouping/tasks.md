## 1. model-types: groupId on events

- [ ] 1.1 Write failing tests in `packages/model-types`: "should expose detail.groupId when constructed with a group id" and "should leave detail.groupId undefined when constructed without one", for `BaseDocumentEvent` and one concrete event (e.g. `TextAddedEvent`)
- [ ] 1.2 Add optional `groupId?: string` to `EventPayloadBase`, and an optional trailing `groupId` parameter to `BaseDocumentEvent` and every concrete event in `src/events/*`, forwarded to `super`
- [ ] 1.3 Run `yarn test` and `yarn lint` in `packages/model-types`

## 2. model: group context

- [ ] 2.1 Write failing tests for `utils/Context.ts`: "should return undefined from getGroupId outside a group", "should return the same id for nested runInGroup calls", "should return different ids for consecutive groups", "should close the group when fn throws"
- [ ] 2.2 Implement the group stack, `runInGroup(fn)` and `getGroupId()` in `packages/model/src/utils/Context.ts` (counter-based ids, nested calls reuse the outer id, pop in `finally`)
- [ ] 2.3 Write failing `EditorJSModel.spec.ts` tests for `group(fn)`: returns `fn`'s result, re-throws its error
- [ ] 2.4 Add `EditorJSModel.group<T>(fn: () => T): T` wrapping `runInGroup` (without `@WithContext`)

## 3. model: capture and forward the group id

- [ ] 3.1 Write a failing integration test in `EditorJSModel.integration.spec.ts`: "should tag every event with the active group id", running one group that covers text insert/remove/format/unformat, value modify, data node add/remove, block add/remove and tune modify, and asserting that every `EventType.Changed` event (including ones dispatched in microtasks) carries the group's id
- [ ] 3.2 Write a failing integration test: "should keep the group id on DataNodeAddedEvents dispatched in a microtask after the group returned"
- [ ] 3.3 Write a failing integration test: "should leave groupId undefined for mutations outside a group"
- [ ] 3.4 Pass `getGroupId()` at every event-creation site that reads `getContext()` (`EditorDocument`, `BlockNode`, `BlockTune`, `ValueNode`, `ParentInlineNode`, `EditorJSModel`). In `BlockNode.createDataNode`, capture it before `queueMicrotask`
- [ ] 3.5 Forward `event.detail.groupId` at the three re-dispatch sites: `BlockNode` bubbling for text, value and tune events, `EditorDocument.#listenAndBubbleBlockEvent`, and `EditorJSModel.#listenAndBubbleDocumentEvents`
- [ ] 3.6 Run `yarn test`, `yarn lint` and `yarn test:mutations` (if configured) in `packages/model`

## 4. sdk: DocumentAPI contract

- [ ] 4.1 Add `group<T>(fn: () => T): T` with TSDoc to `packages/sdk/src/api/DocumentAPI.ts`
- [ ] 4.2 Update any SDK mocks/stubs of `DocumentAPI` so that `yarn test` and `yarn lint` pass in `packages/sdk`

## 5. core: DocumentAPI.group and batching by group id

- [ ] 5.1 Write failing `DocumentAPI` tests: "should run fn inside model.group and return its result", "should re-throw errors from fn"
- [ ] 5.2 Implement `DocumentAPI.group` in `packages/core/src/api/DocumentAPI/DocumentAPI.ts` by delegating to `EditorJSModel.group`
- [ ] 5.3 Write failing `UndoRedoManager.spec.ts` tests matching the core spec scenarios:
  - should undo a whole group in one step
  - should redo a whole group in one step
  - should keep earlier typing as a separate step
  - should start a new step for typing after a group
  - should keep consecutive groups as separate steps
  - should ignore remote events during a group
- [ ] 5.4 Add the group-id rule to `#canAddToBatch` in `packages/core/src/components/UndoRedoManager.ts`, checked before the existing text-continuation rule (design D1)
- [ ] 5.5 Write an integration test through `Core`: "should undo and redo a grouped block insert without AlreadyExistingKeyError", covering design R2. Its comment should explain why block-construction `DataNodeAddedEvent`s must stay out of undo
- [ ] 5.6 Add an integration test that pins current behaviour: an ungrouped `blocks.split` still produces its current number of undo steps
- [ ] 5.7 Run `yarn test`, `yarn lint` and `yarn test:mutations` (if configured) in `packages/core`

## 6. Docs and wrap-up

- [ ] 6.1 Update `docs/events.md` (add `detail.groupId` to the `BaseDocumentEvent` payload list) and `docs/diagrams/undo-redo-flow.mmd` (add a grouped-action sequence to the core undo manager)
- [ ] 6.2 Note in `docs/collaboration.md` that `collaboration-manager` undo does not yet honour `groupId`
- [ ] 6.3 Run `yarn lint` and `yarn test` from the repo root
- [ ] 6.4 Run `openspec validate undo-grouping --type change` and fix any issues
