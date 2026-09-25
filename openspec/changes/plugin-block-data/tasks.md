## 1. Model types: rename tune → plugin data

- [ ] 1.1 Write failing `Index.spec.ts` cases: `Index.pluginData(1, 'anchors', 'id')` should serialize to `{"k":"plugin","b":1,"plugin":"anchors","key":"id"}`, `Index.parse` should round-trip it, and `PartialIndex#resolve` should throw `PluginDataIndex requires pluginKey` / `DataIndex cannot be combined with pluginName`
- [ ] 1.2 Rename `TuneIndex` → `PluginDataIndex` (`IndexKind.PluginData`; TypeScript members `pluginName`/`pluginKey`, serialized keys `plugin`/`key`), `Index.tune` → `Index.pluginData`, and update `PartialIndex` fields and error messages
- [ ] 1.3 Rename `BlockTuneName`/`createBlockTuneName`/`BlockTuneSerialized` → `PluginDataName`/`createPluginDataName`/`PluginDataSerialized` (`src/BlockTune.ts` → `src/PluginData.ts`) and `TuneModifiedEvent` → `PluginDataModifiedEvent`. Update `EventMap` (`BlockTuneEvents` → `PluginDataEvents`) and the exports in `index.ts`
- [ ] 1.4 Rename the `tunes` key to `plugins` in `BlockNodeSerialized`/`BlockNodeInit`/`BlockData`, and add a serialization test asserting no `tunes` key is produced
- [ ] 1.5 Update `sdk` re-exports of the renamed types and fix every compile error across the workspace (`yarn build` clean)
- [ ] 1.6 Update the jest mocks and fixtures the rename touches: `packages/model/src/entities/BlockNode/__mocks__/index.ts` (`updateTuneData`, plus a `plugins` getter if tests read it), `packages/model/src/entities/BlockTune/__mocks__`, the `jest.mock('../BlockTune')` path in `BlockNode.spec.ts`, and the `types/BlockTuneConstructorParameters.ts` / entities barrel names
- [ ] 1.7 Update `packages/model/src/EditorJSModel.spec.ts`'s hard-coded prototype-method allowlist, which contains `'updateTuneData'` as a string and so breaks with no compile error

## 2. Model: plugin data node and create-on-first-write

- [ ] 2.1 Write failing `BlockNode.spec.ts` cases: updating an absent plugin name should create the entry and emit `PluginDataModifiedEvent` with `previous` `undefined`; updating one key should emit exactly one event; setting a key to `undefined` should remove it and drop an empty entry from serialization
- [ ] 2.2 Rename the `BlockTune` entity to `PluginDataNode` (`src/entities/PluginDataNode`), implement key deletion on `undefined`, and make `serialized` omit deleted keys
- [ ] 2.3 Rename `BlockNode.#tunes`/`tunes`/`updateTuneData` → `#plugins`/`plugins`/`updatePluginData` with create-on-first-write, and have `serialized` omit empty entries
- [ ] 2.4 Rename `EditorDocument.updateTuneData` and `EditorJSModel.updateTuneData` → `updatePluginData`, keeping `@WithContext`, and add a facade test that the event carries the acting `userId`
- [ ] 2.5 Write a failing test, then add a `PluginDataIndex` branch to `EditorDocument.modifyData` that sets the key to `data.value`
- [ ] 2.6 Write a failing test at the `BlockNode`/`EditorDocument` level, then replace the hardcoded `'user'` in the bubbled plugin-data event with `getContext()`, as the value-node path does
- [ ] 2.7 Add a test that a `plugins` entry for an unregistered plugin survives an initialize → serialize round trip

## 3. Core and SDK API: plugin data access

- [ ] 3.1 Add `getPluginData`/`updatePluginData` to the SDK `BlocksAPI` interface, and a `plugins` map to the `insert` params
- [ ] 3.2 Write failing `BlocksAPI.spec.ts` / `BlockManager` tests covering read, write, absent-entry `undefined`, unknown-block error, and insert with a `plugins` map
- [ ] 3.3 Implement them in `core/src/api/BlocksAPI.ts` and `BlockManager` (defaulting `userId` to the config user), and replace the commented-out `tunes` stubs in `BlockManager`
- [ ] 3.4 Write a failing test, then fix `BlocksManager.insert`, which spreads `{ ...data, id, name }` while `BlockNode` reads a nested `data` key — so `insert({ data })` silently creates an empty block today. Nest `data` and pass `plugins` as its own key
- [ ] 3.5 Write failing tests, then make `convert` carry plugin data over and `split` create the new block without it (`move` should already pass — add a test to confirm)
- [ ] 3.6 Write a failing `UndoRedoManager` integration test (first write → undo removes the entry → redo restores it; an update undoes to the previous value), then fix whatever remains after 2.5

## 4. Collaboration: plugin data operations

- [ ] 4.1 Write a failing `CollaborationManager.spec.ts` case: a `PluginDataModifiedEvent` should produce a `Modify` operation with `payload`/`prevPayload`
- [ ] 4.2 Add the `PluginDataModifiedEvent` case to `CollaborationManager.#handleEvent`
- [ ] 4.3 Write failing `OperationsTransformer.spec.ts` cases: shift against block insert, `Neutral` against removal of its block, a plugin-data operation used as the against-operation, and no transform between two plugin-data modifies. Add a regression assertion (not a failing test) that `Operation.inverse()` already swaps `payload`/`prevPayload` for any `Modify`
- [ ] 4.4 Add a `PluginDataIndex` branch to `OperationsTransformer.#applyTransformation`, which dispatches on the **against** operation's index kind and today throws `'Unsupported index type'`. Cover the three call sites in tests: `OTClient`'s pending-operation reduce, `UndoRedoManager.transformStacks`, and `ot-server`'s conflicting-operation reduce
- [ ] 4.5 Widen `ModifyOperationData`'s payload type from `Record<any, any>` so a boolean or string payload compiles, with a test constructing a scalar plugin-data operation
- [ ] 4.6 Add an integration test with two clients where a plugin data change on one is reflected in the other's model
- [ ] 4.7 Update `packages/ot-server`: its `DocumentManager.spec.ts` uses `tunes: {}` both as `initializeDocument` input and inside `expect.objectContaining` assertions. The server applies operations against its own model, so it must be verified end to end with a plugin-data operation

## 5. Typing and v2 conversion

- [ ] 5.1 Write a failing `pluginTypeMaps.spec.ts` case: a `EditorjsPluginDataMap` augmentation should type `getPluginData`/`updatePluginData` for that id, an undeclared id should fall back to `Record<string, unknown>`, and a wrong data shape should be a compile error
- [ ] 5.2 Declare `EditorjsPluginDataMap` in `sdk/src/index.ts`, add its keys to `PluginId`, and type the two `BlocksAPI` methods through a non-distributive `PluginDataFor<Id>` helper
- [ ] 5.3 Write failing `composeDataFromVersion2.spec.ts` cases: object tune data should map to `plugins` under the same key, a primitive or array should land under `value`, a block with no or empty `tunes` should produce no `plugins` key, and existing data conversion should be unaffected (the converter maps no block id today — that is a separate fix)
- [ ] 5.4 Implement the `tunes` → `plugins` mapping in `core/src/utils/composeDataFromVersion2.ts`
- [ ] 5.5 Add an integration test loading a v2 `config.data` document with tune data and asserting the plugin data is readable through `api.blocks.getPluginData`

## 6. Docs and wrap-up

- [ ] 6.1 Update `docs/model.md`, `docs/index-serialization.md` and `docs/events.md` for `PluginDataNode`, `PluginDataIndex` and `PluginDataModifiedEvent`, plus `docs/plugins.md` (the SDK declares **three** augmentable interfaces now) and `.github/agents/docs-updater.agent.md` (its `BlockTune` → `docs/model.md` mapping)
- [ ] 6.2 Update the diagrams `model-tree-structure.mmd`, `events-catalog.mmd` and `architecture-overview.mmd`
- [ ] 6.3 Run `yarn lint`, `yarn test`, and the mutation tests for the touched packages that have them. Fix any regressions
- [ ] 6.4 Run `openspec validate plugin-block-data --type change` and confirm it passes. After archiving, fill the `## Purpose` of the new `plugin-block-data` spec from the proposal's intended-Purpose text
