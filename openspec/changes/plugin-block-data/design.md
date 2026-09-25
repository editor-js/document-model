## Context

The Model already stores per-block extra data: a `BlockTune` entity in `BlockNode.#tunes`, `TuneIndex` (`k: "tune"`), and `TuneModifiedEvent`. Above the Model it is dead-ended:
- `BlockNode.updateTuneData` indexes `this.#tunes[name]` directly, so writing a tune that isn't already present crashes.
- `BlocksAPI` has no method for tune data, and `BlockManager.insert` has `tunes` commented out.
- `EditorDocument.modifyData` only handles `TextIndex`, so undo of a tune change is a silent no-op.
- `CollaborationManager.#handleEvent` has no case for `TuneModifiedEvent` ("Unknown event type").

This change turns that store into plugin-owned data. It is the data layer of the "tunes as plugins" effort. `block-settings-ui` adds the UI surfaces and `remove-block-tunes` deletes the SDK tune kind. Constraint: tools and plugins depend only on `@editorjs/sdk`, which re-exports the renamed types.

## Goals / Non-Goals

**Goals:**
- Per-block plugin data that is created on first write and readable/writable through `BlocksAPI`.
- Plugin data changes are undoable locally and synchronized through OT.
- Remove "tune" from the Model's vocabulary and wire format.
- Carry v2 `tunes` data into v3 `plugins` when a v2 document is loaded.

**Non-Goals:**
- Any UI: the settings menu and block decoration are `block-settings-ui`.
- Removing the SDK `BlockTune` tool contract: that is `remove-block-tunes`.
- Rich or nested plugin data (text nodes, arrays with OT-aware element operations). Plugin data stays a flat key → JSON value map per plugin, as `BlockTune` data is today. See "Deferred: plugin data as a node tree" below for what taking this on would require.
- Runtime enforcement that a plugin writes only under its own name.
- The equivalent gap for `ValueModifiedEvent` in `modifyData`/`CollaborationManager`, although the new branch is structured so a value branch can sit next to it.

## Decisions

### D1. Plugin data is keyed by the plugin's static `name`
Each `BlockNode` holds `plugins: Record<PluginDataName, PluginDataNode>`, where `PluginDataName` is a nominal string and the key is by convention the owning plugin's `name`, the identity already used by `api.plugins` and the plugin type maps.
- *Why:* one identity for "who owns this" across registry, types and stored data, and no separate namespace to collide in.
- *Alternative:* free-form keys. Rejected, because it re-creates the tune-name namespace without an owner.
- The API takes `plugin` as an explicit parameter rather than handing each plugin a pre-scoped API, which keeps `BlocksAPI` a single shared object like the rest of `EditorAPI`.

### D2. Flat, per-key updates with create-on-first-write
`PluginDataNode` keeps today's `BlockTune` semantics: a flat `Record<string, unknown>` updated key by key, with one `PluginDataModifiedEvent` per changed key carrying `{ value, previous }`.
- `BlockNode.updatePluginData(name, data)` creates the node when it is missing. The node is created **empty**, its event listener is attached, and only then is each key applied — constructing it with initial data emits nothing (the constructor path relies on that), and `PluginDataNode.update` dispatches synchronously, so the listener must exist first. Without the listener the whole feature silently no-ops: no event reaches `EditorDocument`, so no undo record and no operation. `#createValueNode` is the precedent.
- Entries are held in a **null-prototype** record and the name must be non-empty. Names arrive from documents, and a plain assignment of a `__proto__` key creates no own property at all (while `Object.fromEntries`, used on load, does), so mixing the load and write paths would silently lose that plugin's data. `PluginRegistry` already solves this the same way.
- Setting a key to `undefined` removes it. A node with no keys is left out of the serialized block, so undoing a first write (value → `undefined`) restores the original serialized shape exactly.
- *Alternative:* a whole-object replace event. Rejected, because per-key events keep OT conflicts narrow: two users changing different keys of the same plugin don't collide.
- *Alternative:* explicit `createPluginData`/`removePluginData` operations. Rejected, because they add Insert/Delete OT cases for no user-visible benefit when the implicit form round-trips.

### D3. Full rename rather than an alias
- `BlockTune` → `PluginDataNode`.
- `TuneIndex` → `PluginDataIndex` (`IndexKind.PluginData`; serialized `k: "plugin"`, `b`, `plugin`, `key`, `id`).
- `Index.tune` → `Index.pluginData`.
- `TuneModifiedEvent` → `PluginDataModifiedEvent`.
- `BlockTuneName`/`BlockTuneSerialized` → `PluginDataName`/`PluginDataSerialized`.
- `PartialIndex` `tuneName`/`tuneKey` → `pluginName`/`pluginKey`.
- The serialized block key `tunes` → `plugins`.

*Why:* keeping `tune` inside the Model would preserve exactly the concept this effort removes, and v3 is pre-1.0. *Alternative:* keep the wire names and rename only in TypeScript. Rejected, because the wire format is what integrators see.

### D4. Plugin data flows through the existing generic undo and OT paths
- `EditorJSModel.updatePluginData(userId, block, plugin, data)` replaces `updateTuneData` and keeps its `@WithContext` decoration, so the emitted events carry the acting user.
- `EditorDocument.modifyData(index, data)` gains a `PluginDataIndex` branch that calls `updatePluginData(blockIndex, plugin, { [key]: data.value })`. `UndoRedoManager` already inverts any `Modified` payload by swapping `value`/`previous`, so no undo-specific code is needed.
- `CollaborationManager.#handleEvent` maps `PluginDataModifiedEvent` → `Operation(Modify, index, { payload: value, prevPayload: previous })`. The apply path already routes `Modify` to `model.modifyData`.
- `OperationsTransformer` needs a `PluginDataIndex` branch in `#applyTransformation`, which dispatches on the *against* operation's index kind and throws for anything it doesn't recognize. This is the load-bearing part: a plugin-data operation becomes the against-op in `OTClient`'s pending-operation reduce, in `UndoRedoManager.transformStacks` for every remote plugin-data event, and in `ot-server`'s conflicting-operation reduce. Being *transformed* is already safe (the text and data branches bail out early), and shifting against block insert/delete already works, because `#transformAgainstBlockOperation` is index-agnostic and `withBlockIndex` is overridden.
- The new branch leaves two plugin-data operations untransformed against each other: server order decides and the last applied wins.
- `ModifyOperationData` is typed `T extends Record<any, any>`, so a boolean or string payload does not compile. It widens to unknown-ish JSON for plugin data.
- `BlockNode` currently re-emits the bubbled tune event with a hardcoded `userId: 'user'` instead of `getContext()`. It is masked at the facade level (`EditorJSModel` re-attaches the acting user from context) but wrong for anything listening on `BlockNode` or `EditorDocument`, so it is fixed here.

### D5. `BlocksAPI` surface
- `getPluginData<T>({ block, plugin }): T | undefined` returns the serialized entry.
- `updatePluginData<T>({ block, plugin, data: Partial<T>, userId? })` merges keys.
- `insert`/`insertMany` accept a `plugins` map.
- `move` already re-inserts the serialized block, so data is preserved.
- `split` keeps data on the original block and gives the new block none.
- `convert` carries plugin data over to the converted block.

This is consistent with the existing `getData`/`updateValue` naming and parameter-object style.

Both methods are typed through a new augmentable `EditorjsPluginDataMap` (D6).

### D6. Plugin data is typed through a third augmentable map
`EditorjsPluginDataMap` (plugin id → stored data shape) joins `EditorjsPluginApiMap` and `ToolPluginOptionsMap`, and `PluginId` gains its keys.
- A declared id infers its shape in both `getPluginData` and `updatePluginData`; an undeclared id falls back to `Record<string, unknown>`.
- The conditional is non-distributive (`[Id] extends [keyof ...]`), the same guard `PublicApiFor` uses, so the `string & {}` member of `PluginId` can't collapse a declared id to the fallback.
- *Why the fallback rather than `never`:* unlike `publicApi`, where `never` usefully forces a plugin to declare its `name`, plugin data is often written by a plugin that has no reason to publish its shape. Making that a compile error would be hostile.
- *Alternative:* a generic parameter the caller passes (`getPluginData<AnchorData>(...)`). Rejected as the primary mechanism, because the shape then has to be restated at every call site, though the generic stays available.

### D7. v2 conversion maps `tunes` onto `plugins` verbatim
`composeDataFromVersion2` currently drops `block.tunes`. It will map each entry into `plugins` under the same key.
- **Keys are preserved as-is.** A v3 plugin that replaces a v2 tune is expected to adopt that tune's name, which is also what makes the plugin data key match. No rename table.
- **Object data is copied key by key.** That is the shape a plugin entry already has.
- **An all-empty `plugins` map is still emitted** (as `{}`), matching how `serialized` treats `tunes` today; only individual empty entries are dropped. A block loaded without a `plugins` key therefore gains `plugins: {}` on serialization — which is why D2's round-trip guarantee is about entries, not about byte-identical output.
- **A primitive or an array is stored under the key `value`.** v2 tune data is `any`, and plugin entries are key/value maps, so a scalar needs a key. `value` is predictable and documented, and it beats dropping the data or refusing the document.
- **Data for an unregistered plugin is kept**, which follows from the store's preservation rule (D8), so loading a v2 document in an editor missing that plugin doesn't lose anything.
- *Alternative:* a config-level migration hook so integrators map names themselves. Rejected as the default: it would make the common case (same name) require configuration. It can be added later if renames turn out to be common.

### D8. Data for unregistered plugins is preserved verbatim
A `plugins` entry whose plugin isn't registered in this editor is loaded, kept and re-serialized unchanged.
- *Why:* in a collaborative document, clients can legitimately run different plugin sets. Dropping unknown entries would let the client with fewer plugins silently delete another client's data.
- *Trade-off:* data for a plugin that has been removed for good lingers in the document. Cleaning that up is an integrator concern, not the editor's.

## Risks / Trade-offs

- **[Breaking wire format: `tunes` → `plugins`, `k: "tune"` → `k: "plugin"`]** → v3 is pre-1.0 and tune data has never been writable end to end, so no real stored data is expected. Call it out in the PR description — the repo keeps no changelog files. Clients and `ot-server` must deploy together, since the server applies operations against its own model.
- **[Plugins can write another plugin's data]** → by convention only, documented. A scoped, typed accessor can be added later without breaking the explicit-`plugin` API.
- **[Concurrent modify on the same key resolves last-writer-wins]** → fine for toggles and scalars. Plugins that need merge semantics split state across keys.
- **[Undo after a remote change to the same key restores the local stale value]** → documented limitation, a consequence of not transforming concurrent plugin-data modifications against each other.
- **[A multi-key `updatePluginData` is not one undo step]** → both history managers refuse to batch `Modified` events, so writing two keys in one call creates two undo steps and one undo reverts only the last key. Accepted for now: plugins that need atomicity write one key, or the batching rules change in a later change.
- **[`BlocksAPI.insert` currently drops block data]** → `BlocksManager.insert` spreads `{ ...data, id, name }` while `BlockNode` reads a nested `data` key, so `insert({ data })` creates an empty block today. Adding `plugins` to the same spread would inherit the bug, so the nesting is fixed as part of this change.

## Migration Plan

1. Model-types rename, then the Model behavior (create-on-first-write, key removal, `modifyData`).
2. `BlocksAPI`/`BlockManager` wiring and the undo integration test.
3. Collaboration mapping and transform rules.
4. The `EditorjsPluginDataMap` typing and the v2 converter mapping.

All of this lands in one PR, since the format break must be atomic. Rollback is reverting the PR.

## Deferred: plugin data as a node tree

Making plugin data a real node tree (value nodes, text nodes, arrays) would let a plugin hold rich text — a footnote body, for example — with character-level collaboration instead of last-writer-wins on a whole string. It is deliberately out of scope here. The investigation, so it doesn't have to be redone:

The Model machinery is already generic: `BlockNode#mapSerializedDataToNodes` builds value/text nodes from arbitrary nested JSON, keyed by a dot-path `DataKey`, and picks the node kind from the `$t` (`NODE_TYPE_HIDDEN_PROP`) marker. Two arrangements are possible:
- **One tree, reserved namespace:** plugin data lives in the block's own data tree under a reserved root key (`plugins.anchors.note`), split out only at serialize time. Plugin text is then addressed by an ordinary `DataIndex`/`TextIndex`, so carets, OT text rules, inline formatting and `InputsRegistry` (keyed by `(blockId, dataKey)`) work unchanged. The preferred option.
- **Separate tree, plugin-scoped indexes:** `PluginDataIndex` grows a keypath and a text-range variant. Cleaner separation, but roughly doubles the index/OT matrix (every transform rule, `PartialIndex.resolve`, `Index.parse`, caret transforms, `modifyData`).

Prerequisites and consequences, whichever arrangement is chosen:
1. **Create-on-first-write is lost.** Node kind comes from the `$t` marker, so a plugin must create nodes explicitly with initial data (mirroring the existing `createData`/`updateValue`/`insertText` block-data methods).
2. **Two OT gaps must be closed first.** `CollaborationManager` handles only text and block events; `DataNodeAddedEvent`, `DataNodeRemovedEvent` and `ValueModifiedEvent` fall through to "Unknown event type". A tree creates and removes nodes, so these stop being side notes.
3. **Text needs a DOM input.** Editable text requires an input attached through a `BlockToolAdapter`, and a plugin is not a block tool, so it needs adapter access or a new input-attachment API. This is the largest piece of work.
4. **Text extraction must exclude plugin data.** `BlockNode#getTextContent` walks the whole tree and feeds `convertBlock`/`splitBlock`, so plugin text would leak into conversion exports unless skipped.
5. **Caret semantics need defining:** navigation order between a block's own inputs and its plugin inputs, and selections spanning both.
6. **Reads get more awkward:** entries come back as serialized nodes with `$t` markers rather than plain objects, so a convenience accessor is wanted for scalar cases.

Because this change keeps entries as flat key → JSON value maps, moving to a tree later is a second format change. It can be softened when the time comes by typing an entry's value as the same recursive shape as block data, which makes `$t`-marked nodes an additive extension rather than a break.
