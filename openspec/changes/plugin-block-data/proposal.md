## Why

Per-block data beyond a block tool's own data (anchors, footnotes, alignment, …) is stored today in `BlockNode`'s `tunes`, but nothing above the Model can reach it:
- `BlockNode.updateTuneData` crashes for a tune the block wasn't created with.
- `BlocksAPI` has no way to read or write it.
- Undo of a change is a silent no-op, because `EditorDocument.modifyData` only handles text formatting.
- `CollaborationManager` drops the event as "Unknown event type".

This change makes per-block data a working, plugin-owned store, and renames it away from "tunes". It is the first of three changes that replace the Block Tune entity with plugins (see the review on [PR #157](https://github.com/editor-js/document-model/pull/157)):
1. **`plugin-block-data`** (this change): the data layer.
2. `block-settings-ui`: the UI surfaces plugins use.
3. `remove-block-tunes`: deleting the old entity.

This change stands on its own. Plugins can use the new API before any UI exists.

## What Changes

- **Model — per-block plugin data.** Rename the BlockNode `tunes` store to `plugins`, keyed by plugin `name`. Writing to an absent entry creates it. Setting a key to `undefined` removes it, and empty entries are left out of serialization. **BREAKING**: the serialized block key `tunes` → `plugins`.
- **Model types — rename.** `TuneIndex` → `PluginDataIndex` (serialized `k: "plugin"`), `Index.tune()` → `Index.pluginData()`, `TuneModifiedEvent` → `PluginDataModifiedEvent`, `BlockTuneName`/`BlockTuneSerialized` → `PluginDataName`/`PluginDataSerialized`, and the `BlockTune` entity → `PluginDataNode`. **BREAKING** for persisted serialized indexes and for listeners of the tune event.
- **Undo/redo.** `EditorDocument.modifyData` applies `Modified` changes addressed by a `PluginDataIndex`, so the existing generic inversion in `UndoRedoManager` works for plugin data.
- **Collaboration.** `CollaborationManager` turns `PluginDataModifiedEvent` into a `Modify` operation, and `OperationsTransformer` gains a plugin-data branch so such an operation can also be the one *transformed against* — without it the transformer throws `'Unsupported index type'` on the first remote plugin-data change, on every client and on `ot-server`. `ModifyOperationData`'s payload type widens from `Record<any, any>` so scalar plugin-data values are representable.
- **Core/SDK API.**
  - `BlocksAPI.getPluginData({ block, plugin })` and `BlocksAPI.updatePluginData({ block, plugin, data, userId? })`.
  - `insert`/`insertMany` accept a `plugins` map.
  - A new augmentable `EditorjsPluginDataMap` (plugin id → stored data shape) types both methods, alongside the existing `EditorjsPluginApiMap` and `ToolPluginOptionsMap`.
  - `move` and `convert` preserve plugin data, and `split` leaves it on the original block.
- **v2 data conversion.** `composeDataFromVersion2` maps each v2 block's `tunes` into the v3 block's `plugins`, keeping keys verbatim so a v3 plugin that adopts a v2 tune's name finds its data. Object data is copied key by key, and a primitive or array is stored under the key `value`. Today the converter drops `tunes` silently.

## Capabilities

### New Capabilities

- `plugin-block-data`: storing, reading, updating, undoing and syncing per-block data owned by a plugin.
  - *Intended Purpose (paste into the folded spec, since archive writes a `TBD` placeholder):* "Plugins persist per-block data in the document Model under their own `name`, instead of through a dedicated Block Tune entity. This capability owns the contract end to end: the `plugins` store on `BlockNode` and its serialized form, the `BlocksAPI` methods plugins use to read and write it, and the guarantee that plugin-data changes are undoable and synchronized like any other document change. The storage primitives live in [[model]] and [[model-types]], the API surface in [[core]] and [[sdk]], and the OT handling in [[collaboration-manager]]."

### Modified Capabilities

- `model`: `BlockNode` holds `PluginDataNode`s (created on first write) instead of `BlockTune`s. `EditorDocument.modifyData` handles plugin-data indexes.
- `model-types`: `PluginDataName`, `PluginDataIndex` (`k: "plugin"`), `PluginDataModifiedEvent`, and `plugins` in the block serialization shape.
- `core`: the `EditorAPI` surface includes `getPluginData`/`updatePluginData` and accepts a `plugins` map on insert. `composeDataFromVersion2` carries v2 `tunes` into `plugins`.
- `sdk`: a third augmentable type map, `EditorjsPluginDataMap`, types the plugin data accessors.
- `collaboration-manager`: plugin-data modifications become `Modify` operations and are transformed against block insert/delete.

## Impact

- **Packages:** `model-types`, `model`, `sdk` (re-exports, the `BlocksAPI` interface and the new type map), `core`, `collaboration-manager`, `ot-server`.
- **Wire format (breaking, pre-1.0):** the block key `tunes` → `plugins` and the index `k: "tune"` → `k: "plugin"`. `ot-server` is **not** a passthrough — it keeps a server-side `EditorJSModel` and applies every operation — so it participates in the transformer change and its fixtures move off `tunes`. Clients and server must deploy together.
- **Unchanged:** the SDK `BlockTune` tool contract still exists after this change. It never touched Model tune data, and its removal is `remove-block-tunes`.
- **Docs to update:**
  - `docs/model.md`: BlockTune, `TuneIndex`, `Index.tune`.
  - `docs/index-serialization.md`: the `TuneIndex` section and the "Tune property change" example.
  - `docs/events.md`: `TuneModifiedEvent`.
  - `docs/plugins.md`: the line that says `@editorjs/sdk` declares **two** augmentable interfaces — it becomes three, and that file is the canonical documentation of the augmentation pattern.
  - `.github/agents/docs-updater.agent.md`: its mapping of the model entity `BlockTune` → `docs/model.md`.
  - Diagrams: `model-tree-structure.mmd`, `events-catalog.mmd`, `architecture-overview.mmd`.
