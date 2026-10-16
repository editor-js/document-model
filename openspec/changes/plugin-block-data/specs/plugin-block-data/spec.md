## ADDED Requirements

### Requirement: Per-block plugin data store
Each block SHALL be able to hold data owned by plugins, stored as a map from a plugin data name (by convention the owning plugin's static `name`) to a flat record of string keys and JSON-serializable values. The store SHALL be serialized under the block's `plugins` key, and a block without plugin data SHALL serialize without a `plugins` entry for that plugin.

A write that would leave the stored data as it is — the value a key already holds, or the removal of a key that is not present — SHALL emit no event, and so SHALL produce neither an operation for collaborators nor an undo step. Plugins re-apply their current state routinely, and an entry that undoes nothing is worse than no entry at all.

Plugin names and the keys within an entry are document data, not identifiers the editor chooses, so neither SHALL be able to collide with `Object.prototype`. A key arriving from a stored document SHALL be held as data whatever it is called, `__proto__` included; a key the entry does not hold SHALL read as absent rather than as an inherited member, both when asking for a plugin's entry and when reading a key within one.

What `getPluginData` and the serialized document hand back SHALL be detached from the store, so that changing it does not change the document. Reading an entry, editing it and passing it back to `updatePluginData` is the obvious way to use the two together, and over a live record the no-op rule above turns it into silent loss: the document has already changed, so the write that should have announced it emits nothing.

#### Scenario: A block with no plugin data
- **GIVEN** a block that has no plugin data at all
- **WHEN** it is serialized
- **THEN** its `plugins` value is an empty map rather than being absent, matching how the store serializes today

#### Scenario: Block initialized with plugin data
- **GIVEN** a block is inserted with `plugins: { anchors: { id: "intro" } }`
- **WHEN** the document is serialized
- **THEN** the block's serialized form contains `plugins: { anchors: { id: "intro" } }`

#### Scenario: Writing plugin data for the first time
- **GIVEN** a block that has no data for plugin `anchors`
- **WHEN** plugin data `{ id: "intro" }` is written for `anchors` on that block
- **THEN** the entry is created with that value instead of an error being thrown, and a `PluginDataModifiedEvent` is emitted for key `id` with `previous` `undefined` and `value` `"intro"`

#### Scenario: Updating one key keeps the others
- **GIVEN** a block with `plugins.anchors` equal to `{ id: "intro", visible: true }`
- **WHEN** `{ visible: false }` is written for `anchors`
- **THEN** the entry becomes `{ id: "intro", visible: false }`, and exactly one `PluginDataModifiedEvent` is emitted, for key `visible`

#### Scenario: Removing the last key drops the entry
- **GIVEN** a block with `plugins.anchors` equal to `{ id: "intro" }`
- **WHEN** `{ id: undefined }` is written for `anchors`
- **THEN** the key is removed, and the serialized block no longer contains an `anchors` entry under `plugins`

#### Scenario: Writing the value a key already holds
- **GIVEN** a block with `plugins.anchors` equal to `{ visible: true }`
- **WHEN** `{ visible: true }` is written for `anchors` again
- **THEN** the data is unchanged and no `PluginDataModifiedEvent` is emitted

#### Scenario: Removing a key that is not there
- **GIVEN** a block whose `anchors` entry has no `visible` key
- **WHEN** `{ visible: undefined }` is written for `anchors`
- **THEN** the data is unchanged and no `PluginDataModifiedEvent` is emitted

#### Scenario: Reading an entry whose keys were all removed
- **GIVEN** a block whose `anchors` entry existed and then had every key removed
- **WHEN** its plugin data is read
- **THEN** `undefined` is returned, the same as for an entry that never existed

#### Scenario: A plugin name that collides with an object-prototype member
- **GIVEN** plugin data is written for a plugin named `__proto__` or `toString`
- **WHEN** it is written and read back, and the document is serialized and re-loaded
- **THEN** the entry is stored and returned as ordinary data, with no prototype of the store affected and no silent loss

#### Scenario: An empty plugin name
- **WHEN** plugin data is written for an empty plugin name
- **THEN** it throws, rather than creating an unaddressable entry

#### Scenario: Unknown plugin data is preserved
- **GIVEN** a document whose block carries a `plugins` entry for a plugin that is not registered in this editor
- **WHEN** the document is loaded and serialized again
- **THEN** that plugin's entry is preserved verbatim

### Requirement: Plugin data API
The system SHALL expose `BlocksAPI.getPluginData({ block, plugin })` and `BlocksAPI.updatePluginData({ block, plugin, data, userId? })`, where `block` is a block index or id. `updatePluginData` SHALL merge the given keys into the plugin's entry, attributing the change to `userId` or, when omitted, to the configured user. Each changed key SHALL be recorded as its own modification, so a call that writes several keys is not a single undo step. `BlocksAPI.insert` and `insertMany` SHALL accept an initial `plugins` map per block.

#### Scenario: Reading plugin data
- **GIVEN** a block with id `b1` whose `plugins.anchors` is `{ id: "intro" }`
- **WHEN** `api.blocks.getPluginData({ block: "b1", plugin: "anchors" })` is called
- **THEN** it returns `{ id: "intro" }`

#### Scenario: Reading absent plugin data
- **WHEN** `getPluginData` is called for a plugin that has no entry on the block
- **THEN** it returns `undefined`

#### Scenario: A plugin named after a member of Object.prototype
- **GIVEN** a block that has no entry for a plugin named `toString`
- **WHEN** `getPluginData({ block: 0, plugin: "toString" })` is called
- **THEN** it returns `undefined`, rather than the function the prototype would answer with

#### Scenario: A key named __proto__ in a stored document
- **GIVEN** a document whose `plugins.anchors` holds a `__proto__` key
- **WHEN** it is loaded and serialized again
- **THEN** the key is still there, because it was held as data rather than reaching a prototype setter

#### Scenario: The first write to a key named after a member of Object.prototype
- **GIVEN** an entry that holds no `toString` key
- **WHEN** `toString` is written for the first time
- **THEN** the change records no previous value, so undoing it removes the key rather than restoring an inherited function

#### Scenario: Editing what was read
- **GIVEN** `getPluginData` returned a plugin's entry
- **WHEN** the caller changes a key on it and passes it to `updatePluginData`
- **THEN** the document is unchanged until that call, which records the change as its own modification

#### Scenario: Writing plugin data
- **WHEN** `api.blocks.updatePluginData({ block: 0, plugin: "anchors", data: { id: "intro" } })` is called
- **THEN** the block at index 0 carries `plugins.anchors.id === "intro"`, and the emitted event's `userId` is the configured user

#### Scenario: Unknown block
- **WHEN** `getPluginData` or `updatePluginData` references a block index or id that does not exist
- **THEN** it throws — naming the id when an id was given, or reporting an out-of-bounds index when an index was given

#### Scenario: Writing several keys at once
- **WHEN** `updatePluginData` is called with two keys in `data`
- **THEN** both are applied, two modifications are recorded, and a single undo reverts only the last one

### Requirement: Plugin data survives block restructuring
Block operations that relocate or transform a block SHALL keep its plugin data consistent: `move` SHALL preserve it, `convert` SHALL carry it over to the converted block, and `split` SHALL leave it on the original block and create the new block without plugin data.

#### Scenario: Moving a block
- **GIVEN** a block carrying plugin data
- **WHEN** it is moved to another index
- **THEN** the block at the new index carries the same plugin data

#### Scenario: Converting a block
- **GIVEN** a block carrying plugin data
- **WHEN** it is converted to another block tool
- **THEN** the resulting block carries the same plugin data

#### Scenario: Splitting a block
- **GIVEN** a block carrying plugin data
- **WHEN** it is split at a caret offset
- **THEN** the original block keeps its plugin data, and the newly inserted block has none

### Requirement: Plugin data changes are undoable
A plugin data change SHALL be recorded by local undo/redo like any other document modification. Undoing it SHALL restore the previous value, including removing a key that did not exist before the change.

#### Scenario: Undoing a first write
- **GIVEN** a block with no `anchors` data, then `updatePluginData` writes `{ id: "intro" }` for `anchors`
- **WHEN** `api.document.undo()` is called
- **THEN** the block serializes without an `anchors` entry, and `api.document.redo()` restores `{ id: "intro" }`

#### Scenario: Undoing an update
- **GIVEN** `plugins.anchors.visible` changed from `true` to `false`
- **WHEN** undo is performed
- **THEN** `visible` is `true` again

#### Scenario: A write that changes nothing adds no undo step
- **GIVEN** `plugins.anchors.visible` is `true` and a plugin writes `{ visible: true }` again
- **WHEN** undo is performed
- **THEN** it reverts whatever the user did before that write, because the no-op write recorded nothing of its own

### Requirement: Plugin data changes are collaborative
A local plugin data change SHALL be sent to collaborators as a `Modify` operation on a `PluginDataIndex`, and a received one SHALL be applied to the local model. Plugin data operations SHALL be transformed against concurrent block insertions and removals so they keep targeting the same block.

#### Scenario: Remote client receives a plugin data change
- **GIVEN** two clients editing the same document
- **WHEN** client A writes `{ visible: false }` for `anchors` on a block
- **THEN** client B's model reflects `visible: false` for that block

#### Scenario: Concurrent block insertion above
- **GIVEN** client A writes plugin data for the block at index 2 while client B concurrently inserts a block at index 0
- **WHEN** both operations are applied on both clients
- **THEN** the plugin data change lands on the same logical block (index 3 after B's insertion) on both clients

#### Scenario: Removing a key reaches collaborators
- **GIVEN** client A removes the `visible` key of a block's `anchors` data
- **WHEN** the operation is serialized, sent, and applied on client B
- **THEN** B's block no longer has that key — a removal carries no value, so it SHALL survive a round trip through JSON, where a key holding `undefined` does not

#### Scenario: Target block removed concurrently
- **GIVEN** client A writes plugin data for a block that client B concurrently removes
- **WHEN** A's operation is transformed against B's removal
- **THEN** it becomes a no-op rather than modifying a different block
